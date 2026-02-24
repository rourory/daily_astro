import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ZodiacSign } from "@prisma/client";
import { createSystemLog } from "@/lib/logger-db";
import {
  IIncomingWebhookPayload,
  ZodiacSignKey,
  IDailyForecastIncoming,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Достаточно, так как только сохранение

const LOG_SOURCE = "Webhook:DailyForecast";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Простая проверка авторизации
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    await createSystemLog({
      level: "WARN",
      source: LOG_SOURCE,
      action: "AuthFailed",
      message: "Invalid cron secret provided",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    locale: "",
    db: { saved: 0, errors: 0 },
  };

  try {
    const payload: IIncomingWebhookPayload = await request.json();

    // 1. Определяем локаль и дату
    const payloadLocale = payload.locale || "ru";
    results.locale = payloadLocale;

    // Приводим дату к UTC midnight для консистентности в БД
    const forecastDate = payload.date ? new Date(payload.date) : new Date();
    const cleanDate = new Date(
      Date.UTC(
        forecastDate.getFullYear(),
        forecastDate.getMonth(),
        forecastDate.getDate()
      )
    );

    await createSystemLog({
      level: "INFO",
      source: LOG_SOURCE,
      action: "SaveStart",
      message: `Saving forecast for locale: ${payloadLocale}`,
      meta: { date: cleanDate.toISOString(), locale: payloadLocale },
    });

    // 2. Сохраняем прогнозы
    const signs = Object.keys(payload.forecasts) as ZodiacSignKey[];

    for (const signKey of signs) {
      // Приводим ключ к enum Prisma
      const prismaSign = signKey.toLowerCase() as ZodiacSign;
      if (!Object.values(ZodiacSign).includes(prismaSign)) continue;

      const data: IDailyForecastIncoming = payload.forecasts[signKey];
      const luckyMetrics = data.lucky_metrics as any;

      // Данные для перевода
      const translationData = {
        love: data.love,
        money: data.money,
        mood: data.mood,
        advice: data.advice,
        affirmation: data.affirmation || "",
        compatibility: (data.compatibility as any) || {},
        tomorrowInsight: data.tomorrow_insight || "",
      };

      try {
        // Шаг А: Создаем или обновляем "скелет" прогноза (языконезависимый)
        const forecast = await prisma.forecast.upsert({
          where: {
            forecastDate_zodiacSign: {
              forecastDate: cleanDate,
              zodiacSign: prismaSign,
            },
          },
          create: {
            forecastDate: cleanDate,
            zodiacSign: prismaSign,
            luckyMetrics: luckyMetrics || {},
            source: payload.raw_astronomy_data ?? { source: "AI" },
          },
          update: {
            luckyMetrics: luckyMetrics || {},
            generatedAt: new Date(),
          },
          select: { id: true },
        });

        // Шаг Б: Сохраняем перевод для текущей локали
        await prisma.forecastTranslation.upsert({
          where: {
            forecastId_locale: {
              forecastId: forecast.id,
              locale: payloadLocale,
            },
          },
          create: {
            forecastId: forecast.id,
            locale: payloadLocale,
            ...translationData,
          },
          update: {
            ...translationData,
          },
        });

        results.db.saved++;
      } catch (e) {
        console.error(`Error saving ${signKey}:`, e);
        results.db.errors++;
        await createSystemLog({
          level: "ERROR",
          source: LOG_SOURCE,
          action: "SaveError",
          message: `Failed to save forecast for ${signKey} (${payloadLocale})`,
          meta: { error: String(e), sign: signKey },
        });
      }
    }

    await createSystemLog({
      level: "INFO",
      source: LOG_SOURCE,
      action: "SaveComplete",
      message: `Webhook processing finished. Saved: ${results.db.saved}`,
      meta: results,
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    await createSystemLog({
      level: "ERROR",
      source: LOG_SOURCE,
      action: "FatalError",
      message: "Unhandled exception in webhook",
      meta: { error: String(error) },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}