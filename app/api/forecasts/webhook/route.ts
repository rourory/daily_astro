import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ZodiacSign, SubscriptionStatus } from "@/lib/types/enums"; // Убедись, что Enum ZodiacSign совпадает
import { IDailyForecast } from "@/lib/types/database";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Plan, Subscription, User } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// === TYPES ===

type IncomingPayload = {
  date: string;
  forecasts: Record<string, IDailyForecast>;
  raw_astronomy_data?: any;
};

// Маппинг для красивого вывода знаков на русском
const ZODIAC_LOCALIZED: Record<string, string> = {
  aries: "Овен ♈",
  taurus: "Телец ♉",
  gemini: "Близнецы ♊",
  cancer: "Рак ♋",
  leo: "Лев ♌",
  virgo: "Дева ♍",
  libra: "Весы ♎",
  scorpio: "Скорпион ♏",
  sagittarius: "Стрелец ♐",
  capricorn: "Козерог ♑",
  aquarius: "Водолей ♒",
  pisces: "Рыбы ♓",
};

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    db: { saved: 0, errors: 0 },
    deliveries: { sent: 0, failed: 0, skipped: 0 },
    expiring: { notified: 0 },
  };

  try {
    const payload: IncomingPayload = await request.json();
    const botToken = process.env.BOT_TOKEN;

    // Работа с датами (UTC midnight)
    const forecastDate = payload.date ? new Date(payload.date) : new Date();
    const cleanDate = new Date(
      Date.UTC(
        forecastDate.getFullYear(),
        forecastDate.getMonth(),
        forecastDate.getDate(),
      ),
    );

    console.log(
      `>>> Starting DailyAstro processing for: ${cleanDate.toISOString().split("T")[0]}`,
    );

    // ==========================================
    // 1. SAVE FORECASTS (Full Data)
    // ==========================================
    const signs = Object.keys(payload.forecasts) as ZodiacSign[];

    for (const sign of signs) {
      if (!Object.values(ZodiacSign).includes(sign)) continue;

      const data = payload.forecasts[sign];

      try {
        await prisma.forecast.upsert({
          where: {
            forecastDate_zodiacSign: {
              forecastDate: cleanDate,
              zodiacSign: sign,
            },
          },
          update: {
            // Basic
            love: data.love,
            money: data.money,
            mood: data.mood,
            advice: data.advice,
            // Plus
            affirmation: data.affirmation,
            compatibility: data.compatibility as unknown as InputJsonValue, // Prisma сохранит как Json
            // Premium (camelCase в схеме <-> snake_case в JSON)
            luckyMetrics: data.lucky_metrics as unknown as InputJsonValue,
            tomorrowInsight: data.tomorrow_insight,

            source: payload.raw_astronomy_data ?? { source: "AI_Gemini" },
            generatedAt: new Date(),
          },
          create: {
            forecastDate: cleanDate,
            zodiacSign: sign,
            love: data.love,
            money: data.money,
            mood: data.mood,
            advice: data.advice,
            affirmation: data.affirmation,
            compatibility: data.compatibility as unknown as InputJsonValue,
            luckyMetrics: data.lucky_metrics as unknown as InputJsonValue,
            tomorrowInsight: data.tomorrow_insight,
            source: payload.raw_astronomy_data ?? { source: "AI_Gemini" },
          },
        });
        results.db.saved++;
      } catch (e) {
        console.error(`Error saving ${sign}:`, e);
        results.db.errors++;
      }
    }

    // ==========================================
    // 2. SEND TO USERS (Plan Aware)
    // ==========================================

    // Получаем активных пользователей с их планом подписки
    const usersToDeliver = (await prisma.user.findMany({
      where: {
        telegramId: { not: null },
        zodiacSign: { not: null },
        isPaused: false,
        subscriptions: {
          some: {
            status: {
              in: [SubscriptionStatus.active, SubscriptionStatus.trial],
            },
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [SubscriptionStatus.active, SubscriptionStatus.trial],
            },
          },
          include: {
            plan: true,
          },
          // ИЗМЕНЕНИЕ ЗДЕСЬ:
          orderBy: {
            createdAt: "desc", // Сортируем по дате создания: самая новая будет первой
            // Если у вас нет поля createdAt, используйте startDate или id (если uuid v7/serial)
          },
          take: 1, // Берем только одну (самую свежую)
        },
      },
    })) as Array<
      User & { subscriptions: Array<Subscription & { plan: Plan }> }
    >;

    for (const user of usersToDeliver) {
      if (!user.zodiacSign || !user.telegramId) {
        results.deliveries.skipped++;
        continue;
      }

      // Check duplicate delivery
      const existingDelivery = await prisma.delivery.findFirst({
        where: { userId: user.id, deliveryDate: cleanDate },
      });
      if (existingDelivery) {
        results.deliveries.skipped++;
        continue;
      }

      // Fetch Saved Forecast
      const forecast = await prisma.forecast.findUnique({
        where: {
          forecastDate_zodiacSign: {
            forecastDate: cleanDate,
            zodiacSign: user.zodiacSign,
          },
        },
      });

      if (!forecast) {
        results.deliveries.skipped++;
        continue;
      }

      // === GENERATE MESSAGE CONTENT BASED ON PLAN ===
      const activeSub = user.subscriptions[0];
      const planName = activeSub.plan.name || "basic"; // fallback to basic

      const isPlus = planName === "plus" || planName === "premium";
      const isPremium = planName === "premium";

      const signName = ZODIAC_LOCALIZED[user.zodiacSign] || user.zodiacSign;
      const datePretty = cleanDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });

      // --- Block: Header & Basic ---
      let message = `✨ <b>Гороскоп: ${signName}</b>\n📅 ${datePretty}\n\n`;
      message += `❤️ <b>Любовь:</b> ${forecast.love}\n`;
      message += `💰 <b>Деньги:</b> ${forecast.money}\n`;
      message += `🧘 <b>Настроение:</b> ${forecast.mood}\n`;
      message += `💡 <b>Совет:</b> ${forecast.advice}\n\n`;

      // --- Block: Plus ---
      if (isPlus) {
        if (forecast.affirmation) {
          message += `🌟 <b>Аффирмация дня:</b>\n<i>"${forecast.affirmation}"</i>\n\n`;
        }

        // Cast JSON to typed object
        const compat = forecast.compatibility as {
          sign: string;
          text: string;
        } | null;
        if (compat && compat.sign) {
          const compatSign = ZODIAC_LOCALIZED[compat.sign] || compat.sign;
          message += `💞 <b>Совместимость:</b> ${compatSign}\n${compat.text}\n\n`;
        }
      }

      // --- Block: Premium ---
      if (isPremium) {
        const metrics = forecast.luckyMetrics as {
          number: number;
          time: string;
          color: string;
        } | null;
        if (metrics) {
          message += `🎰 <b>Числа удачи:</b> ${metrics.number}\n`;
          message += `⏰ <b>Время силы:</b> ${metrics.time}\n`;
          message += `🎨 <b>Цвет успеха:</b> ${metrics.color}\n\n`;
        }

        if (forecast.tomorrowInsight) {
          message += `🔭 <b>Взгляд в завтра:</b>\n${forecast.tomorrowInsight}\n\n`;
        }
      }

      // Footer / Upsell (Optional logic)
      if (!isPremium) {
        message += `<i>Хотите знать больше? <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade">Перейти на Premium</a></i>`;
      } else {
        message += `<i>Ваш персональный астро-помощник</i>`;
      }

      // --- Sending ---
      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.telegramId.toString(),
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          },
        );

        const tgData = await tgRes.json();

        await prisma.delivery.create({
          data: {
            userId: user.id,
            forecastId: forecast.id,
            deliveryDate: cleanDate,
            deliveredAt: tgData.ok ? new Date() : null,
            telegramMessageId: tgData.result?.message_id?.toString(),
            planSnapshot: {
              status: tgData.ok ? "sent" : "failed",
              usedPlan: activeSub.plan.name,
              description: tgData.description,
            },
          },
        });

        if (tgData.ok) results.deliveries.sent++;
        else {
          console.error(`TG Error for ${user.id}:`, tgData);
          results.deliveries.failed++;
        }
      } catch (err) {
        console.error(`Net Error for ${user.id}:`, err);
        results.deliveries.failed++;
      }
    }

    // 3. EXPIRING NOTICES (Same logic as before)
    await handleExpiringSubscriptions(
      botToken,
      process.env.NEXT_PUBLIC_APP_URL,
      results,
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function handleExpiringSubscriptions(
  botToken: string | undefined,
  appUrl: string | undefined,
  results: any,
) {
  if (!botToken) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.active, SubscriptionStatus.trial] },
      OR: [
        { renewAt: { lte: tomorrow, gte: new Date() } },
        { trialEndsAt: { lte: tomorrow, gte: new Date() } },
      ],
    },
    include: { user: true },
  });

  for (const sub of expiringSubscriptions) {
    if (!sub.user.telegramId) continue;
    const isTrial = sub.status === SubscriptionStatus.trial;
    const expiryDate = isTrial ? sub.trialEndsAt : sub.renewAt;
    const dateStr = expiryDate
      ? new Date(expiryDate).toLocaleDateString("ru-RU")
      : "скоро";

    const message = isTrial
      ? `⏳ <b>Пробный период заканчивается!</b>\nДата: ${dateStr}.\n<a href="${appUrl}/pricing">Оформить подписку</a>`
      : `⚠️ <b>Ваша подписка истекает ${dateStr}.</b>\n<a href="${appUrl}/pricing">Продлить доступ</a>`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: sub.user.telegramId.toString(),
          text: message,
          parse_mode: "HTML",
        }),
      });
      results.expiring.notified++;
    } catch (e) {
      // ignore
    }
  }
}
