import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  ZodiacSign,
  SubscriptionStatus,
  ZODIAC_SIGN_VALUES,
  ZODIAC_NAMES,
} from "@/lib/types/enums";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const telegramWebhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL ||
  "https://dailyastro.site/api/webhooks/telegram";

export async function GET(request: Request) {
  // Verify cron secret (skip if not set for local development)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = {
    forecasts: { generated: 0 },
    deliveries: { sent: 0, failed: 0, skipped: 0 },
    expiring: { notified: 0 },
    webhook: { status: "unknown" as string },
  };

  try {
    const botToken = process.env.BOT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    // 1. Setup bot webhook if not set
    if (botToken && appUrl) {
      const webhookUrl = telegramWebhookUrl;
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(telegramWebhookUrl)}`,
        );
        const data = await response.json();
        results.webhook = {
          status: data.ok ? "set" : "failed",
          // description: data.description,
        };
      } catch {
        results.webhook = { status: "error" };
      }
    }

    // 2. Generate forecasts for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingForecasts = await prisma.forecast.findMany({
      where: { forecastDate: today },
      select: { zodiacSign: true },
    });
    const existingSigns = new Set(existingForecasts.map((f) => f.zodiacSign));

    // Get templates grouped by category
    const templates = await prisma.contentTemplate.findMany({
      where: { isActive: true },
    });

    const templatesByCategory: Record<string, typeof templates> = {};
    for (const t of templates) {
      if (!templatesByCategory[t.category])
        templatesByCategory[t.category] = [];
      templatesByCategory[t.category].push(t);
    }

    const getRandomTemplate = (category: string) => {
      const arr = templatesByCategory[category] || [];
      return arr.length > 0
        ? arr[Math.floor(Math.random() * arr.length)].textRu
        : "Прогноз готовится...";
    };

    for (const sign of ZODIAC_SIGN_VALUES) {
      if (existingSigns.has(sign)) continue;

      await prisma.forecast.create({
        data: {
          zodiacSign: sign,
          forecastDate: today,
          love: getRandomTemplate("love"),
          money: getRandomTemplate("money"),
          mood: getRandomTemplate("mood"),
          advice: getRandomTemplate("advice"),
          source: { source: "templates", date: today.toISOString() },
        },
      });
      results.forecasts.generated++;
    }

    // 3. Deliver forecasts to users with active subscriptions
    const usersToDeliver = await prisma.user.findMany({
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
          take: 1,
        },
      },
    });

    for (const user of usersToDeliver) {
      if (!user.zodiacSign || !user.telegramId) {
        results.deliveries.skipped++;
        continue;
      }

      // Check if already delivered today
      const existingDelivery = await prisma.delivery.findFirst({
        where: {
          userId: user.id,
          deliveryDate: today,
        },
      });

      if (existingDelivery) {
        results.deliveries.skipped++;
        continue;
      }

      const forecast = await prisma.forecast.findUnique({
        where: {
          forecastDate_zodiacSign: {
            forecastDate: today,
            zodiacSign: user.zodiacSign as ZodiacSign,
          },
        },
      });

      if (!forecast) {
        results.deliveries.skipped++;
        continue;
      }

      const signName =
        ZODIAC_NAMES[user.zodiacSign as ZodiacSign] || user.zodiacSign;
      const todayStr = today.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });

      const message = `<b>${signName}</b> — ${todayStr}

<b>Любовь:</b> ${forecast.love}

<b>Финансы:</b> ${forecast.money}

<b>Настроение:</b> ${forecast.mood}

<b>Совет дня:</b> ${forecast.advice}

Хорошего дня!`;

      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.telegramId.toString(),
              text: message,
              parse_mode: "HTML",
            }),
          },
        );

        const result = await response.json();

        await prisma.delivery.create({
          data: {
            userId: user.id,
            forecastId: forecast.id,
            deliveryDate: today,
            deliveredAt: result.ok ? new Date() : null,
            telegramMessageId: result.result?.message_id?.toString(),
            planSnapshot: {
              status: result.ok ? "sent" : "failed",
              error: result.ok ? null : result.description,
            },
          },
        });

        if (result.ok) {
          results.deliveries.sent++;
        } else {
          results.deliveries.failed++;
        }
      } catch (error) {
        await prisma.delivery.create({
          data: {
            userId: user.id,
            forecastId: forecast.id,
            deliveryDate: today,
            planSnapshot: { error: String(error) },
          },
        });
        results.deliveries.failed++;
      }
    }

    // 4. Notify users about expiring subscriptions
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.trial] },
        OR: [
          { renewAt: { lte: tomorrow } },
          { trialEndsAt: { lte: tomorrow } },
        ],
      },
      include: {
        user: true,
        plan: true,
      },
    });

    for (const sub of expiringSubscriptions) {
      if (!sub.user.telegramId || !botToken) continue;

      const isTrial = sub.status === SubscriptionStatus.trial;
      const expiryDate = isTrial ? sub.trialEndsAt : sub.renewAt;
      const dateStr = expiryDate
        ? new Date(expiryDate).toLocaleDateString("ru-RU")
        : "скоро";

      const message = isTrial
        ? `Ваш пробный период заканчивается ${dateStr}.\n\nДля продолжения оформите подписку: ${appUrl}/subscribe`
        : `Ваша подписка "${sub.plan.name}" истекает ${dateStr}.\n\nДля продления перейдите: ${appUrl}/subscribe`;

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
      } catch {
        // Ignore notification errors
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Daily cron error:", error);
    return NextResponse.json(
      { error: String(error), results },
      { status: 500 },
    );
  }
}
