// app/api/forecasts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
// Типы могут импортироваться иначе, но для примера оставим ваши
import {
  CompatibilityData,
  IDailyForecastIncoming,
  LuckyMetricsData,
} from "@/lib/types/database";

function isISODateString(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: Request) {
  /* ================= AUTH ================= */
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth");

  if (authCookie?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ================= URL PARAMS ================= */
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  // Добавляем поддержку локали, по умолчанию "ru"
  const locale = url.searchParams.get("locale") || "ru";

  /* ================= DATE LOGIC ================= */
  // Сегодня в UTC (00:00)
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const todayStr = todayUTC.toISOString().slice(0, 10);

  const dateStr = dateParam && isISODateString(dateParam) ? dateParam : todayStr;

  // Создаём UTC-границы дня
  const startOfDayUTC = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDayUTC = new Date(`${dateStr}T23:59:59.999Z`);

  // Ограничение: сегодня и -30 дней (если нужно)
  // const minDateUTC = new Date(todayUTC);
  // minDateUTC.setUTCDate(minDateUTC.getUTCDate() - 30);
  // if (startOfDayUTC < minDateUTC || startOfDayUTC > todayUTC) { ... } 
  // (Оставил проверку дат на ваше усмотрение, в админке иногда полезно смотреть будущее)

  /* ================= DB QUERY ================= */
  try {
    const results = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
      },
      // ВАЖНО: Подтягиваем переводы только для выбранного языка
      include: {
        translations: {
          where: { locale: locale },
          take: 1, // На всякий случай берем один, хотя уникальность гарантирована схемой
        },
      },
      orderBy: { zodiacSign: "asc" },
    });

    /* ================= MAPPING ================= */
    // Теперь собираем плоский объект из двух таблиц
    const payload: IDailyForecastIncoming[] = results.map((f) => {
      // Берем первый (и единственный) перевод из массива или пустой объект, если перевода нет
      const t = f.translations[0] || {};

      return {
        id: f.id,
        zodiac_sign: f.zodiacSign,
        forecast_date: f.forecastDate,
        
        // Технические поля остались в основной модели
        source: f.source,
        generated_at: f.generatedAt,
        lucky_metrics: f.luckyMetrics as unknown as LuckyMetricsData,

        // Текстовые поля берем из translations
        // Используем оператор объединения (|| ""), чтобы не упасть, если перевода нет
        love: t.love || "",
        money: t.money || "",
        mood: t.mood || "",
        advice: t.advice || "",
        affirmation: t.affirmation || "",
        tomorrow_insight: t.tomorrowInsight || "",
        
        // JSON внутри перевода
        compatibility: (t.compatibility || {}) as unknown as CompatibilityData,
      };
    });

    return NextResponse.json({
      date: dateStr,
      locale: locale, // Полезно возвращать локаль в ответе
      forecasts: payload,
    });
  } catch (err) {
    console.error("API /api/forecasts error:", err);
    return NextResponse.json({
      date: dateStr,
      forecasts: [],
      error: "Internal Server Error"
    }, { status: 500 });
  }
}