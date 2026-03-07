// app/api/forecasts/cron/route.ts (или где лежит ваш крон)
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { createSystemLog } from "@/lib/logger-db";
import { UI_LABELS } from "@/lib/localized-message-labels";
import { sendPushNotification } from "@/lib/notifications/push";
import { sendNotificationEmail } from "@/lib/email"; // Импортируем нашу новую функцию

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 минут

const LOG_SOURCE = "Cron:DailyDelivery";
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    usersProcessed: 0,
    sentForecast: 0,
    sentExpiredRef: 0,
    skipped: {
      timeNotArrived: 0,
      alreadySent: 0,
      noForecastData: 0,
      error: 0,
    },
    channels: {
      push: 0,
      email: 0,
    },
  };

  try {
    // 1. Выбираем пользователей (Active или Trial), у которых есть пуши ИЛИ включен email
    const activeUsers = await prisma.user.findMany({
      where: {
        zodiacSign: { not: null },
        isPaused: false,
        // ИЗМЕНЕНИЕ: Пользователь должен иметь пуши ИЛИ emailNotification: true
        OR: [{ pushSubscriptions: { some: {} } }, { emailNotification: true }],
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
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        pushSubscriptions: true, // Нужно для проверки длины массива
      },
    });

    results.usersProcessed = activeUsers.length;

    for (const user of activeUsers) {
      if (!user.zodiacSign) continue;

      const hasPush = user.pushSubscriptions.length > 0;
      const hasEmail = user.emailNotification;

      // --- 2. Проверка Времени (Timezone) ---
      const now = new Date();
      let userLocalTime: Date;
      try {
        const localTimeString = now.toLocaleString("en-US", {
          timeZone: user.timezone,
        });
        userLocalTime = new Date(localTimeString);
      } catch (e) {
        userLocalTime = now;
      }

      const userCurrentHour = userLocalTime.getHours();
      const [deliveryHour] = user.deliveryTime.split(":").map(Number);

      if (userCurrentHour < deliveryHour) {
        results.skipped.timeNotArrived++;
        continue;
      }

      const targetDate = new Date(
        Date.UTC(
          userLocalTime.getFullYear(),
          userLocalTime.getMonth(),
          userLocalTime.getDate(),
        ),
      );

      // --- 3. Проверка Дубликатов ---
      const existingDelivery = await prisma.delivery.findFirst({
        where: { userId: user.id, deliveryDate: targetDate },
        select: { id: true },
      });

      if (existingDelivery) {
        results.skipped.alreadySent++;
        continue;
      }

      const ui = UI_LABELS[user.locale] || UI_LABELS["ru"];
      const activeSub = user.subscriptions[0];

      // ============================================================
      // ЛОГИКА ИСТЕЧЕНИЯ ТРИАЛА
      // ============================================================
      const isTrial = activeSub.status === SubscriptionStatus.trial;

      if (isTrial && activeSub.trialEndsAt && activeSub.trialEndsAt < now) {
        const title = ui.trial_ended_title || "Пробный период завершен";
        const body =
          ui.trial_ended_body ||
          "Оформите подписку, чтобы продолжить получать гороскопы.";
        const url = `${baseUrl}/upgrade`;

        let pushSent = false;
        let emailSent = false;

        if (hasPush) {
          try {
            await sendPushNotification(user.id, {
              title,
              body,
              url: "/upgrade",
            });
            pushSent = true;
          } catch (e) {
            console.error(`Trial Push Error (${user.id}):`, e);
          }
        }

        if (hasEmail) {
          try {
            await sendNotificationEmail({
              email: user.email,
              subject: "Подписка Daily Astro приостановлена 🔮",
              title: title,
              body: body,
              buttonText: "Продлить подписку",
              buttonUrl: url,
            });
            emailSent = true;
          } catch (e) {
            console.error(`Trial Email Error (${user.id}):`, e);
          }
        }

        if (pushSent || emailSent) {
          await prisma.delivery.create({
            data: {
              userId: user.id,
              forecastId: null,
              deliveryDate: targetDate,
              deliveredAt: new Date(),
              sentContentSnapshot: {
                locale: user.locale,
                status: "sent",
                type: "trial_expired_notification",
                channels: { push: pushSent, email: emailSent },
              },
            },
          });

          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: { status: SubscriptionStatus.expired },
          });

          results.sentExpiredRef++;
          if (pushSent) results.channels.push++;
          if (emailSent) results.channels.email++;
        } else {
          results.skipped.error++;
        }
        continue;
      }
      // ============================================================

      // --- 4. Получение Гороскопа ---
      const forecast = await prisma.forecast.findUnique({
        where: {
          forecastDate_zodiacSign: {
            forecastDate: targetDate,
            zodiacSign: user.zodiacSign,
          },
        },
        include: {
          translations: { where: { locale: user.locale }, take: 1 },
        },
      });

      if (!forecast || !forecast.translations[0]) {
        results.skipped.noForecastData++;
        continue;
      }

      const translation = forecast.translations[0];
      const signKey = user.zodiacSign.toLowerCase();
      const signDisplay = ui.signs[signKey] || signKey;

      // --- 5. Формирование контента ---
      const title = `✨ ${ui.header || "Гороскоп"}: ${signDisplay}`;
      const previewText =
        `${ui.advice || "Совет"}: ${translation.advice}`.substring(0, 150) +
        "...";
      const url = `${baseUrl}/forecast`;

      let pushSent = false;
      let emailSent = false;

      // Отправляем Пуш
      if (hasPush) {
        try {
          await sendPushNotification(user.id, {
            title,
            body: previewText,
            url: "/forecast",
          });
          pushSent = true;
        } catch (err) {
          console.error(`Push Error (${user.id}):`, err);
        }
      }

      // Отправляем Email
      if (hasEmail) {
        try {
          await sendNotificationEmail({
            email: user.email,
            subject: `Ваш гороскоп на сегодня: ${signDisplay} ✨`,
            title: title,
            body: previewText,
            buttonText: "Читать полный прогноз",
            buttonUrl: url,
          });
          emailSent = true;
        } catch (err) {
          console.error(`Email Error (${user.id}):`, err);
        }
      }

      // Если хотя бы один канал сработал, сохраняем факт доставки
      if (pushSent || emailSent) {
        await prisma.delivery.create({
          data: {
            userId: user.id,
            forecastId: forecast.id,
            deliveryDate: targetDate,
            deliveredAt: new Date(),
            sentContentSnapshot: {
              locale: user.locale,
              status: "sent",
              plan: activeSub.plan.name,
              type: "daily_forecast",
              preview: previewText,
              channels: { push: pushSent, email: emailSent }, // Сохраняем информацию о том, куда ушло
            },
          },
        });

        results.sentForecast++;
        if (pushSent) results.channels.push++;
        if (emailSent) results.channels.email++;
      } else {
        // Если оба метода упали (например, отвалился SMTP и истекли VAPID токены одновременно)
        results.skipped.error++;
      }
    }

    if (results.sentForecast > 0 || results.sentExpiredRef > 0) {
      await createSystemLog({
        level: "INFO",
        source: LOG_SOURCE,
        action: "BatchComplete",
        message: `Batch processed. Sent: ${results.sentForecast}, Expired: ${results.sentExpiredRef}`,
        meta: results,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Critical cron error:", error);
    await createSystemLog({
      level: "ERROR",
      source: LOG_SOURCE,
      action: "FatalError",
      message: "Cron job crashed",
      meta: { error: String(error) },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
