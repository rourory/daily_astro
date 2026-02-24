import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { createAutoPayment } from "@/lib/payment/yookassa";
import { createSystemLog } from "@/lib/logger-db";
import { sendMessage } from "@/lib/webhooks/telegram/send-message";
import { getMessages } from "@/lib/webhooks/telegram/localization-helpers";

export const dynamic = "force-dynamic"; // Важно для Next.js App Router, чтобы не кэшировалось

export async function GET(request: NextRequest) {
  const LOG_SOURCE = "CRON_RENEWAL";

  try {
    // 1. Авторизация Cron
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      await createSystemLog({
        level: "WARN",
        source: LOG_SOURCE,
        action: "AUTH_FAILED",
        message: "Unauthorized access attempt",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Поиск подписок для продления
    const now = new Date();

    // Ищем Active или Trial, у которых наступил renewAt и есть токен
    const subsToRenew = await prisma.subscription.findMany({
      where: {
        renewAt: { lte: now },
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.trial] },
        paymentProvider: "yookassa",
        paymentToken: { not: null },
        user: { isPaused: false }, // Пропускаем тех, кто глобально на паузе
      },
      include: {
        user: true,
        plan: true,
      },
    });

    if (subsToRenew.length === 0) {
      return NextResponse.json({ message: "No subscriptions to renew" });
    }

    await createSystemLog({
      level: "INFO",
      source: LOG_SOURCE,
      action: "BATCH_START",
      message: `Найдено ${subsToRenew.length} подписок к продлению`,
    });

    const results = [];

    // 3. Обработка списком
    for (const sub of subsToRenew) {
      const orderId = uuidv4();
      const amountRub = sub.priceAmount / 100; // int копейки -> float рубли
      const telegramId = sub.user.telegramId
        ? Number(sub.user.telegramId)
        : null;
      const t = await getMessages(sub.user.locale || "ru");
      try {
        // А) Создаем запись платежа (Pending)
        const paymentRecord = await prisma.payment.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            orderId: orderId,
            amount: sub.priceAmount,
            currency: sub.currency,
            status: PaymentStatus.pending,
            isRecurring: true,
            metadata: {
              plan_name: sub.plan.name,
              type: "recurring_renewal",
            },
          },
        });

        // Б) Запрос в ЮKassa
        // ВАЖНО: передаем subscriptionId, чтобы Webhook потом нашел этот платеж
        const yooPayment = await createAutoPayment(
          amountRub,
          sub.paymentToken!,
          `Продление подписки ${sub.plan.name}`,
          {
            subscriptionId: sub.id,
            userId: sub.userId,
            isRecurring: "true",
          },
        );

        // В) Обновляем ID провайдера
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            providerPaymentId: yooPayment.id,
            metadata: {
              ...(paymentRecord.metadata as object),
              yookassa_status: yooPayment.status,
            },
          },
        });

        // Г) Результат
        // Мы НЕ обновляем дату renewAt здесь. Это сделает Webhook при статусе payment.succeeded.
        results.push({
          subId: sub.id,
          status: "initiated",
          paymentId: yooPayment.id,
        });
      } catch (error: any) {
        // Д) Если API ЮКассы вернуло ошибку сразу (например, токен отозван)
        console.error(`Renewal failed for sub ${sub.id}`, error);

        // 1. Помечаем платеж как Failed
        const failedPayment = await prisma.payment.findUnique({
          where: { orderId },
        });
        if (failedPayment) {
          await prisma.payment.update({
            where: { id: failedPayment.id },
            data: {
              status: PaymentStatus.failed,
              metadata: { error: error.message },
            },
          });
        }

        // 2. СТАВИМ ПОДПИСКУ НА ПАУЗУ
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.paused },
        });

        // 3. Лог ошибки
        await createSystemLog({
          level: "ERROR",
          source: LOG_SOURCE,
          action: "RENEWAL_API_ERROR",
          message: `Ошибка API при продлении. Подписка приостановлена.`,
          meta: { error: error.message, subId: sub.id },
        });

        // 4. Уведомляем пользователя
        if (telegramId) {
          await sendMessage(
            telegramId,
            t.Bot.subscribe_stopped_recurring_payment_error.replace(
              "${sub.plan.name}",
              sub.plan.name,
            ),
          );
        }

        results.push({
          subId: sub.id,
          status: "error_paused",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
    });
  } catch (error: any) {
    await createSystemLog({
      level: "ERROR",
      source: LOG_SOURCE,
      action: "CRON_CRASH",
      message: "Критическая ошибка Cron",
      meta: { error: error.message },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
