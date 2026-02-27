import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { cancelYookassaPayment } from "@/lib/payment/yookassa";
import { createSystemLog } from "@/lib/logger-db";
import { sendMessage } from "@/lib/webhooks/telegram/send-message";
import { getMessages } from "@/lib/webhooks/telegram/localization-helpers";

const LOG_SOURCE = "YOOKASSA_WEBHOOK";

export async function POST(request: NextRequest) {
  let eventType = "unknown";
  let paymentId = "unknown";

  try {
    const event = await request.json();
    const { event: type, object: paymentObject } = event;

    eventType = type;
    paymentId = paymentObject?.id;

    // 1. Лог входящего события
    await createSystemLog({
      level: "INFO",
      source: LOG_SOURCE,
      action: "INCOMING_EVENT",
      message: `Webhook: ${eventType}`,
      meta: { payment_id: paymentId, amount: paymentObject.amount },
    });

    const metadata = paymentObject.metadata || {};
    const subscriptionId = metadata.subscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ status: "ignored_no_metadata" });
    }

    // 2. Ищем платеж, подписку и пользователя (для telegramId)
    const dbPayment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentId },
      include: {
        subscription: {
          include: { user: true },
        },
      },
    });

    if (!dbPayment) {
      await createSystemLog({
        level: "ERROR",
        source: LOG_SOURCE,
        action: "PAYMENT_NOT_FOUND",
        message: `Платеж ${paymentId} не найден в базе`,
        meta: { subscriptionId },
      });
      return NextResponse.json({ status: "payment_not_found" });
    }

    const user = dbPayment.subscription?.user;
    const t = await getMessages(user?.locale || "ru");
    // Преобразуем BigInt в number безопасно
    const telegramId = user?.telegramId ? Number(user.telegramId) : null;

    // Хелпер для отправки уведомлений
    const notifyUser = async (text: string) => {
      if (telegramId) {
        try {
          await sendMessage(telegramId, text);
          await createSystemLog({
            level: "INFO",
            source: LOG_SOURCE,
            action: "TELEGRAM_SENT",
            message: "Уведомление отправлено",
            meta: { telegramId },
          });
        } catch (err: any) {
          console.error("Telegram send error", err);
        }
      }
    };

    switch (eventType) {
      // ======================================================================
      // 1. ПРИВЯЗКА КАРТЫ (TRIAL / SETUP)
      // ======================================================================
      case "payment.waiting_for_capture": {
        if (
          paymentObject.payment_method?.saved &&
          paymentObject.payment_method?.id
        ) {
          const methodId = paymentObject.payment_method.id;

          // А) Сохраняем токен карты
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { paymentToken: methodId },
          });

          // Б) Отменяем холдирование (освобождаем 1 рубль)
          try {
            await cancelYookassaPayment(paymentId);

            await createSystemLog({
              level: "INFO",
              source: LOG_SOURCE,
              action: "HOLD_CANCELED",
              message: "Setup-платеж отменен (средства разморожены).",
              meta: { paymentId },
            });

            // В) Уведомляем пользователя
            await notifyUser(t.Bot.success_binding);
          } catch (cancelError: any) {
            await createSystemLog({
              level: "ERROR",
              source: LOG_SOURCE,
              action: "HOLD_CANCEL_FAILED",
              message: "Ошибка отмены холдирования",
              meta: { error: cancelError.message, paymentId },
            });
          }
        }
        break;
      }

      // ======================================================================
      // 2. УСПЕШНОЕ СПИСАНИЕ (RECURRING)
      // ======================================================================
      case "payment.succeeded": {
        // Обновляем статус платежа
        await prisma.payment.update({
          where: { id: dbPayment.id },
          data: { status: PaymentStatus.succeeded },
        });

        // Продлеваем подписку (Логика: текущая дата + 30 дней)
        // В продакшене лучше брать durationDays из модели Plan
        const newRenewDate = new Date();
        newRenewDate.setDate(newRenewDate.getDate() + 30);

        // Форматируем дату для сообщения
        const nextDateStr = newRenewDate.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        });

        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: SubscriptionStatus.active,
            renewAt: newRenewDate,
          },
        });

        await createSystemLog({
          level: "INFO",
          source: LOG_SOURCE,
          action: "RECURRING_SUCCESS",
          message: "Подписка продлена успешно",
          meta: { paymentId, newRenewDate },
        });

        await notifyUser(
          t.Bot.success_recurrent_payment.replace("{nextDateStr}", nextDateStr),
        );

        break;
      }

      // ======================================================================
      // 3. ОТМЕНА / ОШИБКА (CANCELED)
      // ======================================================================
      case "payment.canceled": {
        // Проверяем, техническая ли это отмена (Setup 1 RUB)
        const isSetup =
          (dbPayment.metadata as any)?.type === "setup_payment" ||
          dbPayment.amount === 100;

        // Дополнительная проверка: если у подписки УЖЕ есть токен, значит мы прошли waiting_for_capture
        const currentSub = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          select: { paymentToken: true },
        });
        const hasToken = !!currentSub?.paymentToken;

        if (isSetup && hasToken) {
          // Это мы сами отменили платеж в блоке waiting_for_capture. Все ок.
          await prisma.payment.update({
            where: { id: dbPayment.id },
            data: {
              status: PaymentStatus.canceled,
              metadata: {
                ...(dbPayment.metadata as object),
                cancellation_reason: "setup_void",
              },
            },
          });
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: SubscriptionStatus.trial }, // Возвращаем в trial, так как это был холд для привязки карты
          });
        } else {
          // --- ЭТО РЕАЛЬНЫЙ СБОЙ (НЕТ ДЕНЕГ / ОТМЕНА) ---

          // 1. Помечаем платеж как Failed
          await prisma.payment.update({
            where: { id: dbPayment.id },
            data: {
              status: PaymentStatus.failed,
              metadata: {
                ...(dbPayment.metadata as object),
                cancellation_details: paymentObject.cancellation_details,
              },
            },
          });

          // 2. Ставим подписку на ПАУЗУ
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { status: SubscriptionStatus.paused },
          });

          await createSystemLog({
            level: "WARN",
            source: LOG_SOURCE,
            action: "SUB_PAUSED_BANK",
            message: "Подписка приостановлена (отказ банка)",
            meta: {
              paymentId,
              reason: paymentObject.cancellation_details?.reason,
            },
          });

          // 3. Уведомляем пользователя
          const reason = paymentObject.cancellation_details?.reason;
          let reasonText = "Банк отклонил операцию.";
          if (reason === "insufficient_funds")
            reasonText = "Недостаточно средств на карте.";

          await notifyUser(
            t.Bot.payment_failed.replace("{reasonText}", reasonText),
          );
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await createSystemLog({
      level: "ERROR",
      source: LOG_SOURCE,
      action: "WEBHOOK_CRASH",
      message: error.message,
      meta: { stack: error.stack },
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
