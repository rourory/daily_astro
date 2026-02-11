import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCheckout } from "@/lib/bepaid";
import { v4 as uuidv4 } from "uuid";
import {
  ZodiacSign,
  PlanName,
  SubscriptionStatus,
  ZODIAC_NAMES,
} from "@/lib/types/enums";
import { sendMessage } from "../webhooks/telegram/route";

// Plan configuration
const PLANS: Record<string, { name: string; price: number; dbName: PlanName }> =
  {
    basic: { name: "Базовый", price: 300, dbName: PlanName.basic },
    plus: { name: "Плюс", price: 600, dbName: PlanName.plus },
    premium: { name: "Премиум", price: 1200, dbName: PlanName.premium },
  };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      telegram_username,
      zodiac_sign,
      birth_date,
      timezone,
      email,
      plan_id,
    } = body;

    // Validate required fields
    if (!telegram_username || !zodiac_sign || !plan_id) {
      return NextResponse.json(
        { error: "Заполните обязательные поля: Telegram и знак зодиака" },
        { status: 400 },
      );
    }

    const plan = PLANS[plan_id];
    if (!plan) {
      return NextResponse.json({ error: "Неверный тариф" }, { status: 400 });
    }

    // Validate zodiac sign
    const zodiacSignEnum = zodiac_sign as ZodiacSign;
    if (!Object.values(ZodiacSign).includes(zodiacSignEnum)) {
      return NextResponse.json(
        { error: "Неверный знак зодиака" },
        { status: 400 },
      );
    }

    // Clean username - store as @username@telegram.web for linking
    const cleanUsername = telegram_username.replace("@", "").toLowerCase();
    const userEmail = `@${cleanUsername}@telegram.web`;

    // Check if user already exists by email
    let user = await prisma.user.findFirst({
      where: { email: userEmail },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: userEmail,
          zodiacSign: zodiacSignEnum,
          birthDate: birth_date ? new Date(birth_date) : null,
          timezone: timezone || "Europe/Minsk",
          locale: "ru",
          deliveryTime: "07:30:00",
          isPaused: false,
        },
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          zodiacSign: zodiacSignEnum,
          birthDate: birth_date ? new Date(birth_date) : user.birthDate,
          timezone: timezone || user.timezone,
        },
      });
    }

    // Get or create plan in database
    let dbPlan = await prisma.plan.findUnique({
      where: { name: plan.dbName },
    });

    if (!dbPlan) {
      dbPlan = await prisma.plan.create({
        data: {
          name: plan.dbName,
          priceBynMonth: plan.price,
          features: { tier: plan_id },
          isActive: true,
        },
      });
    }

    // Check for existing active subscription
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
        {
          error:
            "У вас уже есть активная подписка. Напишите боту @Dailyastrobelarusbot для управления",
        },
        { status: 400 },
      );
    }

    // Create subscription with trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: dbPlan.id,
        status: SubscriptionStatus.trial,
        trialEndsAt,
        renewAt: trialEndsAt,
        paymentProvider: "bepaid",
      },
    });
    if (user.telegramId) {
      await sendMessage(
        Number(user.telegramId),
        `Пробный семидневный период активирован до ${trialEndsAt.toISOString()}! После оплаты вам будет доступна полноценная подписка\n\nВаш знак: ${ZODIAC_NAMES[user.zodiacSign as ZodiacSign]}.`,
        {
          reply_markup: {
            inline_keyboard: [
              // [
              //   {
              //     text: "Получить прогноз на сегодня",
              //     callback_data: "get_forecast",
              //   },
              // ],
              [{ text: "Настройки", callback_data: "settings" }],
            ],
          },
        },
      );
    }
    // Try to create checkout for payment after trial
    const orderId = uuidv4();

    try {
      const checkout = await createCheckout({
        orderId,
        amount: plan.price,
        description: `Daily Astro — ${plan.name} (месяц)`,
        email: email || undefined,
        telegramId: cleanUsername,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return?subscription=${subscription.id}`,
        notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/bepaid`,
        recurring: true,
      });

      // Save pending payment
      await prisma.payment.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          orderId,
          amountByn: plan.price,
          currency: "BYN",
          status: "pending",
          isRecurring: true,
        },
      });

      return NextResponse.json({
        success: true,
        user_id: user.id,
        subscription_id: subscription.id,
        checkout_url: checkout.checkout.redirect_url,
        trial_ends_at: trialEndsAt.toISOString(),
        message:
          "Подписка создана. После оплаты напишите боту @Dailyastrobelarusbot",
      });
    } catch (checkoutError) {
      // If bePaid is not configured, still create trial
      console.error(
        "Checkout error (bePaid may not be configured):",
        checkoutError,
      );

      return NextResponse.json({
        success: true,
        user_id: user.id,
        subscription_id: subscription.id,
        trial_ends_at: trialEndsAt.toISOString(),
        message:
          "Пробный период активирован! Напишите боту @Dailyastrobelarusbot для получения прогнозов",
        checkout_url: null,
      });
    }
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка сервера" },
      { status: 500 },
    );
  }
}
