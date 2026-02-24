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
  createYookassaPayment,
  createYookassaSetupPayment,
  type YookassaPaymentMetadata,
} from "@/lib/payment/yookassa"; // Предполагаемый путь к твоему файлу с хелпером
import { PaymentService, SubscriptionService } from "@/lib/dal/services";

export interface SubscribeSuccessResponse {
  success: true;
  subscription_id: string;
  trial_ends_at: string; // ISO string
  confirmation_token: string;
  payment_id: string;
}

export interface SubscribeErrorResponse {
  success?: false;
  error: string;
}

export type SubscribeResponse =
  | SubscribeSuccessResponse
  | SubscribeErrorResponse;

// Типы провайдеров (как на фронте)
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
      telegram_username,
      zodiac_sign,
      birth_date,
      plan_id,
      locale = "ru",
      timezone = "Europe/Minsk",
      currency, // Например: "RUB"
      paymentProvider, // Например: "yookassa"
      amount, // Сумма в минимальных единицах (копейках)
    } = body;

    // 1. Валидация входных данных
    console.log(body);
    if (
      !telegram_username ||
      !zodiac_sign ||
      !plan_id ||
      !currency ||
      !paymentProvider
    ) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 },
      );
    }

    // 2. Валидация Enum-ов
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

    // 3. Поиск Плана и Цены в БД
    const dbPlan = await prisma.plan.findUnique({
      where: { id: plan_id },
      include: { prices: true },
    });

    if (!dbPlan) {
      return NextResponse.json({ error: "Тариф не найден" }, { status: 400 });
    }

    // Ищем цену строго для выбранной валюты
    const priceObj = dbPlan.prices.find((p) => p.currency === currency);

    if (!priceObj) {
      return NextResponse.json(
        { error: `Цена для тарифа в валюте ${currency} не установлена` },
        { status: 400 },
      );
    }

    // Первичная подписка всегда бесплатна, не имеет значения
    // // Сверка цены (безопасность)
    // if (priceObj.amount !== amount) {

    //   return NextResponse.json(
    //     { error: "Цена тарифа изменилась, попробуйте обновить страницу." },
    //     { status: 409 },
    //   );
    // }

    // 4. Работа с Пользователем (Upsert)
    const cleanUsername = telegram_username.replace("@", "").toLowerCase();
    const userEmail = `@${cleanUsername}@telegram.web`; // Временная генерация email

    const user = await prisma.user.upsert({
      where: { email: userEmail }, // Лучше искать по telegramId если он есть, но тут логика через email/username
      update: {
        zodiacSign: zodiac_sign as ZodiacSign,
        birthDate: birth_date ? new Date(birth_date) : undefined,
        timezone: timezone,
        locale: locale,
        countryCode: locale === "ru" ? "RU" : "US", // Упрощенная логика, в идеале определять по IP
      },
      create: {
        email: userEmail,
        zodiacSign: zodiac_sign as ZodiacSign,
        birthDate: birth_date ? new Date(birth_date) : null,
        timezone: timezone,
        locale: locale,
        deliveryTime: "07:30:00",
        isPaused: false,
      },
    });

    // 5. Проверка активных подписок (чтобы не дублировать)
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [
            SubscriptionStatus.active,
            SubscriptionStatus.trial,
            SubscriptionStatus.grace,
          ],
        },
      },
    });

    if (existingSub) {
      return NextResponse.json(
        { error: "У вас уже есть активная подписка." },
        { status: 400 },
      );
    }

    // 6. Подготовка данных для создания подписки и платежа
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 дней триала

    const orderId = uuidv4(); // Уникальный ID заказа для нашей системы

    // 7. Создаем Подписку и Платеж в транзакции (или последовательно)
    // Создаем подписку со статусом TRIAL (но она ждет привязки карты через платеж)

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: dbPlan.id,
        status: SubscriptionStatus.trial, // Ставим trial, ожидая успешного платежа для привязки карты
        currency: priceObj.currency,
        priceAmount: priceObj.amount,
        trialEndsAt: trialEndsAt,
        renewAt: trialEndsAt, // Первое списание произойдет в конце триала
        paymentProvider: paymentProvider,
      },
    });

    // Создаем запись о платеже (Pending)

    const paymentRecord = await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        orderId: orderId,
        amount: priceObj.amount,
        currency: priceObj.currency,
        status: PaymentStatus.pending,
        isRecurring: true,
        metadata: {
          plan_name: dbPlan.name,
          provider: paymentProvider,
        },
      },
    });

    // 8. Инициализация платежа во внешнем сервисе
    let paymentData;

    switch (paymentProvider as PaymentProviderId) {
      case "yookassa":
        // Конвертируем копейки в рубли (100 -> 1.00)
        const yookassaAmount = 0.0;

        // Метаданные для вебхука (чтобы понять, какую подписку обновлять)
        const metadata: YookassaPaymentMetadata = {
          subscriptionId: subscription.id,
          isRecurring: "true",
          email: user.email || undefined,
        };

        try {
          // Вызываем хелпер
          // Важно: description должен быть понятным пользователю
          const description = `Привязка карты для подписки ${dbPlan.name} (7 дней бесплатно, далее ${priceObj.amount / 100} ${priceObj.currency})`;

          const yookassaResponse = await createYookassaSetupPayment(
            description,
            metadata,
            "embedded",
          );
          console.log("Yookassa setup payment response:", yookassaResponse);
          // Сохраняем ID платежа от провайдера
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

          paymentData = {
            confirmation_token:
              yookassaResponse.confirmation.confirmation_token!,
            payment_id: yookassaResponse.id,
          };
        } catch (e: any) {
          console.error("Yookassa creation failed", e);
          // Откатываем создание подписки/платежа в случае ошибки API (опционально)
          await prisma.payment.update({
            where: { id: paymentRecord.id },
            data: {
              status: PaymentStatus.failed,
              metadata: { error: e.message },
            },
          });
          throw new Error("Ошибка создания платежа в ЮKassa: " + e.message);
        }
        break;

      case "bepaid":
      case "robokassa":
      case "stripe":
      case "paypal":
        // Заглушка для других методов
        return NextResponse.json(
          { error: `Провайдер ${paymentProvider} временно недоступен` },
          { status: 501 },
        );

      default:
        return NextResponse.json(
          { error: "Неизвестный платежный провайдер" },
          { status: 400 },
        );
    }

    // 9. Возвращаем данные на фронт
    return NextResponse.json<SubscribeSuccessResponse>({
      success: true,
      subscription_id: subscription.id,
      trial_ends_at: trialEndsAt.toISOString(),
      ...paymentData, // confirmation_token, payment_id
    });
  } catch (error: any) {
    console.error("Subscribe API error:", error);
    return NextResponse.json<SubscribeErrorResponse>(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
