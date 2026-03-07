import prisma from "@/lib/prisma";
import { PlanName, ZodiacSign } from "@prisma/client";

export interface ForecastData {
  date: Date;
  sign: ZodiacSign;

  // Basic
  love: string;
  money: string;
  mood: string;
  advice: string;

  // Plus
  affirmation: string;
  compatibility: { sign: ZodiacSign; text: string };

  // Premium
  luckyMetrics: {
    time: string;
    color: "string";
    number: number;
  };
  tomorrowInsight: string;
}

export type ForecastResult = {
  status: "success" | "no_user" | "no_zodiac" | "no_forecast";
  data?: ForecastData;
  userPlan?: PlanName;
  userSign?: string;
};

export async function getUserForecast(
  userId: string,
  locale: string = "ru",
): Promise<ForecastResult> {
  // 1. Получаем пользователя и его активную подписку
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: {
          status: { in: ["active", "trial"] },
          // Проверяем, не истекла ли подписка
          OR: [
            { trialEndsAt: { gt: new Date() } },
            { renewAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!user) return { status: "no_user" };
  if (!user.zodiacSign) return { status: "no_zodiac" };

  // 2. Определяем текущий план
  const activeSub = user.subscriptions[0];
  const planName = activeSub?.plan?.name || PlanName.basic;

  // 3. Ищем прогноз на сегодня (UTC начало дня)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const forecast = await prisma.forecast.findFirst({
    where: {
      zodiacSign: user.zodiacSign,
      forecastDate: { gte: today },
    },
    orderBy: { forecastDate: "desc" },
    include: {
      translations: { where: { locale } }, // Берем перевод для текущей локали
    },
  });

  if (!forecast)
    return {
      status: "no_forecast",
      userPlan: planName,
      userSign: user.zodiacSign,
    };

  // Если нет перевода на нужный язык, пробуем fallback на ru или берем первый попавшийся
  const t =
    forecast.translations[0] ||
    (await prisma.forecastTranslation.findFirst({
      where: { forecastId: forecast.id },
    }));

  if (!t)
    return {
      status: "no_forecast",
      userPlan: planName,
      userSign: user.zodiacSign,
    };

  // 4. Формируем данные
  // Мы возвращаем ВСЕ данные, но на фронте будем решать, показывать их или блюрить/лочить
  // Это позволит показать "демо" контента (например, размытый текст)

  const result = {
    date: forecast.forecastDate,
    sign: user.zodiacSign,

    // Basic
    love: t.love,
    money: t.money,
    mood: t.mood,
    advice: t.advice,

    // Plus
    affirmation: t.affirmation,
    compatibility: t.compatibility as { sign: ZodiacSign; text: string },

    // Premium
    luckyMetrics: forecast.luckyMetrics as {
      time: string;
      color: "string";
      number: number;
    },
    tomorrowInsight: t.tomorrowInsight,
  };

  return {
    status: "success",
    data: result,
    userPlan: planName,
    userSign: user.zodiacSign,
  };
}
