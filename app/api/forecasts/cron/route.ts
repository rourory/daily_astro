import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubscriptionStatus, PlanName } from "@prisma/client";
import { createSystemLog } from "@/lib/logger-db";
// Импортируем объект с лейблами (заголовки рубрик, названия знаков)
import { UI_LABELS } from "@/lib/localized-message-labels";
import { Translations } from "@/lib/types/webhook/telegram";
import { getMessages } from "@/lib/webhooks/telegram/localization-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 минут

const LOG_SOURCE = "Cron:DailyDelivery";
const DEFAULT_LOCALE = "ru";

// === MAIN CRON JOB ===

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
  };

  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error("BOT_TOKEN missing");

    // 1. Выбираем пользователей (Active или Trial)
    const activeUsers = await prisma.user.findMany({
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
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    results.usersProcessed = activeUsers.length;

    // Кэш для переводов JSON (чтобы не грузить файл 100 раз для 100 юзеров)
    const jsonCache: Record<string, Translations> = {};

    for (const user of activeUsers) {
      if (!user.zodiacSign || !user.telegramId) continue;

      // --- 2. Проверка Времени (Timezone) ---
      const now = new Date();
      let userLocalTime: Date;
      try {
        const localTimeString = now.toLocaleString("en-US", {
          timeZone: user.timezone,
        });
        userLocalTime = new Date(localTimeString);
      } catch (e) {
        userLocalTime = now; // Fallback to Server Time (UTC usually)
      }

      const userCurrentHour = userLocalTime.getHours();
      const [deliveryHour] = user.deliveryTime.split(":").map(Number); // "07:30" -> 7

      if (userCurrentHour < deliveryHour) {
        results.skipped.timeNotArrived++;
        continue;
      }

      // Целевая дата (полночь по локальному времени юзера)
      const targetDate = new Date(
        Date.UTC(
          userLocalTime.getFullYear(),
          userLocalTime.getMonth(),
          userLocalTime.getDate(),
        ),
      );

      // --- 3. Проверка Дубликатов (Уже отправляли сегодня?) ---
      const existingDelivery = await prisma.delivery.findFirst({
        where: { userId: user.id, deliveryDate: targetDate },
        select: { id: true },
      });

      if (existingDelivery) {
        results.skipped.alreadySent++;
        continue;
      }

      // Подготовка локализации
      // A. UI Labels (Заголовки прогноза)
      const ui = UI_LABELS[user.locale] || UI_LABELS["ru"];

      // B. JSON Messages (Сервисные сообщения бота)
      if (!jsonCache[user.locale]) {
        jsonCache[user.locale] = await getMessages(user.locale);
      }
      const t = jsonCache[user.locale];

      const activeSub = user.subscriptions[0];

      // ============================================================
      // ЛОГИКА ИСТЕЧЕНИЯ ТРИАЛА
      // ============================================================
      const isTrial = activeSub.status === SubscriptionStatus.trial;

      // Если это триал И дата окончания прошла
      if (isTrial && activeSub.trialEndsAt && activeSub.trialEndsAt < now) {
        // Берем текст из JSON (Bot.trial_ended_text)
        const message = t.Bot.trial_ended_text || "Trial ended.";
        const btnText = t.Bot.trial_ended_btn || "Subscribe";

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
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: btnText,
                        url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
                      },
                    ],
                  ],
                },
              }),
            },
          );
          const tgData = await tgRes.json();

          // Создаем Delivery, но forecastId = null
          await prisma.delivery.create({
            data: {
              userId: user.id,
              forecastId: null, // Прогноза нет
              deliveryDate: targetDate,
              deliveredAt: tgData.ok ? new Date() : null,
              telegramMessageId: tgData.result?.message_id?.toString(),
              sentContentSnapshot: {
                locale: user.locale,
                status: tgData.ok ? "sent" : "failed",
                type: "trial_expired_notification",
              },
            },
          });

          if (tgData.ok) {
            results.sentExpiredRef++;
            // Здесь можно опционально сразу менять статус подписки в БД на 'expired',
            // чтобы завтра крон его вообще не выбирал.
            await prisma.subscription.update({
              where: { id: activeSub.id },
              data: { status: SubscriptionStatus.expired },
            });
          } else {
            results.skipped.error++;
          }
        } catch (e) {
          console.error(`Error sending trial expired to ${user.id}`, e);
          results.skipped.error++;
        }

        // ВАЖНО: Пропускаем отправку гороскопа
        continue;
      }
      // ============================================================

      // --- 4. Отправка Гороскопа (Если подписка активна) ---

      const forecast = await prisma.forecast.findUnique({
        where: {
          forecastDate_zodiacSign: {
            forecastDate: targetDate,
            zodiacSign: user.zodiacSign,
          },
        },
        include: {
          translations: {
            where: { locale: user.locale },
            take: 1,
          },
        },
      });

      if (!forecast || !forecast.translations[0]) {
        results.skipped.noForecastData++;
        continue;
      }

      const translation = forecast.translations[0];
      const signKey = user.zodiacSign.toLowerCase();

      // Название знака берем из UI_LABELS
      const signDisplay = ui.signs[signKey] || signKey;

      const datePretty = targetDate.toLocaleDateString(
        user.locale === "ru" ? "ru-RU" : user.locale,
        {
          day: "numeric",
          month: "long",
        },
      );

      // Сборка сообщения (используем UI_LABELS для заголовков)
      let message = `✨ <b>${ui.header || "Horoscope"}: ${signDisplay}</b>\n📅 ${datePretty}\n\n`;

      // Basic
      message += `❤️ <b>${ui.love}:</b> ${translation.love}\n`;
      message += `💰 <b>${ui.money}:</b> ${translation.money}\n`;
      message += `🧘 <b>${ui.mood}:</b> ${translation.mood}\n`;
      message += `💡 <b>${ui.advice}:</b> ${translation.advice}\n\n`;

      const planName = activeSub.plan.name;
      const isPlus =
        planName === PlanName.plus || planName === PlanName.premium;
      const isPremium = planName === PlanName.premium;

      // Plus
      if (isPlus) {
        if (translation.affirmation) {
          message += `🌟 <b>${ui.affirmation}:</b>\n<i>"${translation.affirmation}"</i>\n\n`;
        }
        const comp = translation.compatibility as any;
        if (comp && comp.sign) {
          const partnerSignRaw = comp.sign.toLowerCase();
          // Название знака партнера тоже берем из UI_LABELS
          const partnerDisplay = ui.signs[partnerSignRaw] || comp.sign;
          message += `💞 <b>${ui.compatibility}:</b> ${partnerDisplay}\n${comp.text}\n\n`;
        }
      }

      // Premium
      if (isPremium) {
        const metrics = forecast.luckyMetrics as any;
        if (metrics && metrics.number) {
          message += `🎰 <b>${ui.lucky_numbers}:</b> ${metrics.number}\n`;
          message += `⏰ <b>${ui.power_time}:</b> ${metrics.time}\n`;
          message += `🎨 <b>${ui.color}:</b> ${metrics.color}\n\n`;
        }
        if (translation.tomorrowInsight) {
          message += `🔭 <b>${ui.tomorrow}:</b>\n${translation.tomorrowInsight}\n\n`;
        }
      }

      // Footer
      if (!isPremium) {
        // message += `<i>${ui.upgrade_text} <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade">${ui.upgrade_btn}</a></i>`;
      } else {
        message += `<i>${ui.footer}</i>`;
      }

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
            deliveryDate: targetDate,
            deliveredAt: tgData.ok ? new Date() : null,
            telegramMessageId: tgData.result?.message_id?.toString(),
            sentContentSnapshot: {
              locale: user.locale,
              status: tgData.ok ? "sent" : "failed",
              plan: planName,
              type: "daily_forecast",
            },
          },
        });

        if (tgData.ok) {
          results.sentForecast++;
        } else {
          console.warn(`TG Error for user ${user.id}:`, tgData.description);
          results.skipped.error++;
        }
      } catch (err) {
        console.error(`Network error for user ${user.id}`, err);
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
