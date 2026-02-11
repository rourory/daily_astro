// app/api/forecasts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { Forecast } from "@prisma/client";
import {
  CompatibilityData,
  ForecastSource,
  IDailyForecast,
  LuckyMetricsData,
} from "@/lib/types/database";

function isISODateString(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: Request) {
  /* ================= AUTH ================= */
  const cookieStore = cookies();
  const authCookie = (await cookieStore).get("admin_auth");

  if (authCookie?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ================= DATE ================= */
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  // Сегодня в UTC (00:00)
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const todayStr = todayUTC.toISOString().slice(0, 10);

  const dateStr =
    dateParam && isISODateString(dateParam) ? dateParam : todayStr;

  // 🚨 КЛЮЧЕВОЙ МОМЕНТ:
  // Всегда явно создаём UTC-границы дня
  const startOfDayUTC = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDayUTC = new Date(`${dateStr}T23:59:59.999Z`);

  // Ограничение: сегодня и -30 дней
  const minDateUTC = new Date(todayUTC);
  minDateUTC.setUTCDate(minDateUTC.getUTCDate() - 30);

  if (startOfDayUTC < minDateUTC || startOfDayUTC > todayUTC) {
    return NextResponse.json(
      { error: "date out of allowed range" },
      { status: 400 },
    );
  }

  /* ================= DB ================= */
  try {
    const results = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
      },
      orderBy: { zodiacSign: "asc" },
    });

    const payload: IDailyForecast[] = results.map((f: Forecast) => ({
      id: f.id,
      zodiac_sign: f.zodiacSign as any,
      forecast_date: f.forecastDate,
      source: f.source as unknown as ForecastSource,
      generated_at: f.generatedAt,
      love: f.love,
      money: f.money,
      mood: f.mood,
      advice: f.advice,
      affirmation: f.affirmation,
      compatibility: f.compatibility as unknown as CompatibilityData,
      lucky_metrics: f.luckyMetrics as unknown as LuckyMetricsData,
      tomorrow_insight: f.tomorrowInsight,
    }));

    return NextResponse.json({
      date: dateStr,
      forecasts: payload,
    });
  } catch (err) {
    console.error("API /api/forecasts error:", err);
    return NextResponse.json({
      date: dateStr,
      forecasts: [],
    });
  }
}
