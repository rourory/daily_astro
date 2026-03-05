import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  ZodiacSign,
  SubscriptionStatus,
  Currency,
  PaymentStatus,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import {
  createYookassaPayment, // Для полных платежей
  createYookassaSetupPayment, // Для привязки карты (триал)
  type YookassaPaymentMetadata,
} from "@/lib/payment/yookassa";

export interface SubscribeSuccessResponse {
  success: true;
  subscription_id: string;
  trial_ends_at: string | null;
  confirmation_token: string;
  payment_id: string;
}

export interface SubscribeErrorResponse {
  success?: false;
  error: string;
}

export type PaymentProviderId =
  | "yookassa"
  | "bepaid"
  | "robokassa"
  | "stripe"
  | "paypal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email, // Теперь главный идентификатор
      zodiac_sign,
      plan_id,
      locale = "ru",
      timezone = "Europe/Minsk",
      currency,
      paymentProvider,
      amount, // Сумма от фронтенда (0 для триала, полная для покупки)
    } = body;

    // 1. Валидация входных данных
    if (!email || !zodiac_sign || !plan_id || !currency || !paymentProvider) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 },
      );
    }

    // Валидация Email (базовая)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Некорректный формат email" },
        { status: 400 },
      );
    }

    // Валидация Enum-ов
    const validZodiacs = Object.values(ZodiacSign) as string[];
    if (!validZodiacs.includes(zodiac_sign)) {
      return NextResponse.json(
        { error: `Неверный знак зодиака: ${zodiac_sign}` },
        { status: 400 },
      );
    }

    const validCurrencies = Object.values(Currency) as string[];
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json({ error: "Неверная валюта" }, { status: 400 });
    }

    // 2. Поиск Плана и Цены в БД
    const dbPlan = await prisma.plan.findUnique({
      where: { id: plan_id },
      include: { prices: true },
    });

    if (!dbPlan) {
      return NextResponse.json({ error: "Тариф не найден" }, { status: 400 });
    }

    const priceObj = dbPlan.prices.find((p) => p.currency === currency);
    if (!priceObj) {
      return NextResponse.json(
        { error: `Цена для тарифа в валюте ${currency} не установлена` },
        { status: 400 },
      );
    }

    // 3. Работа с Пользователем (Find or Create)
    // Мы ищем юзера по email.

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: true,
        payments: { where: { status: PaymentStatus.succeeded } }, // Загружаем успешные платежи для проверки права на триал
      },
    });

    // Определяем право на триал
    let isTrialEligible = true;

    if (user) {
      // Если юзер есть, проверяем активные подписки
      const activeSub = user.subscriptions.find(
        (s) =>
          s.status === SubscriptionStatus.active ||
          s.status === SubscriptionStatus.trial,
      );

      if (activeSub) {
        return NextResponse.json(
          { error: "У вас уже есть активная подписка." },
          { status: 400 },
        );
      }

      // Проверяем право на триал: если были успешные платежи или старые подписки - триал не положен
      if (user.payments.length > 0 || user.subscriptions.length > 0) {
        isTrialEligible = false;
      }

      // Обновляем данные пользователя (знак, таймзона могли измениться)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          zodiacSign: zodiac_sign as ZodiacSign,
          timezone,
          locale,
        },
        include: { subscriptions: true, payments: true },
      });
    } else {
      // Создаем нового пользователя
      user = await prisma.user.create({
        data: {
          email,
          zodiacSign: zodiac_sign as ZodiacSign,
          timezone,
          locale,
          countryCode: locale === "ru" ? "RU" : "US",
          deliveryTime: "07:00:00",
        },
        include: { subscriptions: true, payments: true },
      });
      // Новым пользователям всегда положен триал
      isTrialEligible = true;
    }

    // 4. Подготовка данных для Подписки
    const orderId = uuidv4();

    // Если положен триал -> amount = 0 (или 1 рубль для auth), renew через 7 дней
    // Если не положен -> amount = полная цена, renew через месяц
    const shouldUseTrial = isTrialEligible; // Можно добавить логику && amount === 0, если доверяем фронту

    const trialDays = 7;
    const now = new Date();

    let trialEndsAt: Date | null = null;
    let renewAt: Date;
    let initialPaymentAmount: number;

    if (shouldUseTrial) {
      trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      renewAt = trialEndsAt; // Первое реальное списание в конце триала
      initialPaymentAmount = 0; // Для привязки карты
    } else {
      trialEndsAt = null;
      renewAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // След. списание через месяц
      initialPaymentAmount = priceObj.amount; // Списываем сразу
    }

    // 5. Создаем Subscription (Pending)
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: dbPlan.id,
        status: SubscriptionStatus.pending, // Ждем оплаты/привязки
        currency: priceObj.currency,
        priceAmount: priceObj.amount, // Сумма продления (всегда полная цена)
        trialEndsAt: trialEndsAt,
        renewAt: renewAt,
        paymentProvider: paymentProvider,
      },
    });

    // 6. Создаем Payment (Pending)
    const paymentRecord = await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        orderId: orderId,
        amount: initialPaymentAmount,
        currency: priceObj.currency,
        status: PaymentStatus.pending,
        isRecurring: true,
        metadata: {
          plan_name: dbPlan.name,
          provider: paymentProvider,
          type: shouldUseTrial ? "setup_payment" : "first_payment", // Метка типа платежа
        },
      },
    });

    // 7. Инициализация платежа (Yookassa)
    let paymentData;

    if (paymentProvider === "yookassa") {
      const metadata: YookassaPaymentMetadata = {
        subscriptionId: subscription.id,
        isRecurring: "true",
        email: user.email,
      };

      try {
        let yookassaResponse;

        if (shouldUseTrial) {
          // --- СЦЕНАРИЙ ТРИАЛА (Привязка карты) ---
          const description = `Привязка карты для подписки ${dbPlan.name} (7 дней бесплатно, далее ${priceObj.amount / 100} ${priceObj.currency}/мес)`;
          // Используем метод для setup (обычно это платеж на 0 или 1 рубль с save_payment_method=true)
          yookassaResponse = await createYookassaSetupPayment(
            description,
            metadata,
            "embedded",
          );
        } else {
          // --- СЦЕНАРИЙ ПОКУПКИ (Списание сразу) ---
          const description = `Оплата подписки ${dbPlan.name} (1 месяц)`;
          yookassaResponse = await createYookassaPayment(
            initialPaymentAmount,
            description,
            metadata,
            "embedded", // или undefined, если редирект
          );
        }

        console.log("Yookassa response:", yookassaResponse.id);

        // Обновляем paymentId
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            providerPaymentId: yookassaResponse.id,
            metadata: {
              ...(paymentRecord.metadata as object),
              yookassa_response: yookassaResponse as any,
            },
          },
        });

        if (!yookassaResponse.confirmation?.confirmation_token) {
          throw new Error("Не получен токен подтверждения от ЮКассы");
        }

        paymentData = {
          confirmation_token: yookassaResponse.confirmation.confirmation_token,
          payment_id: yookassaResponse.id,
        };
      } catch (e: any) {
        console.error("Yookassa creation failed", e);
        // Откат
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { status: PaymentStatus.failed },
        });
        await prisma.subscription.delete({ where: { id: subscription.id } });

        throw new Error("Ошибка создания платежа: " + e.message);
      }
    } else {
      return NextResponse.json(
        { error: `Провайдер ${paymentProvider} временно недоступен` },
        { status: 501 },
      );
    }

    // 8. Ответ
    return NextResponse.json<SubscribeSuccessResponse>({
      success: true,
      subscription_id: subscription.id,
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
      ...paymentData,
    });
  } catch (error: any) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
