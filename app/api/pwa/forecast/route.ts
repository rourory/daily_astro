import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/jwt"; // Ваша функция на jose
import { getUserForecast } from "@/lib/services/forecast";
import { cookies } from "next/headers";
import { PlanName } from "@prisma/client";

export async function GET(req: Request) {
  // 1. Получаем токен из куки (приоритет) или заголовка
  const cookieToken = (await cookies()).get("session_token")?.value;
  const authHeader = req.headers.get("authorization")?.split(" ")[1];
  const token = cookieToken || authHeader;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Проверяем сессию
  const payload = await verifySession(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 3. Получаем данные через сервис
  // Локаль можно достать из URL или заголовка Accept-Language
  const { status, data, userPlan } = await getUserForecast(payload.userId, "ru");

  if (status === "no_user") return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (status === "no_zodiac") return NextResponse.json({ error: "Setup incomplete" }, { status: 400 });
  if (status === "no_forecast") return NextResponse.json({ error: "Forecast pending" }, { status: 404 });

  // 4. Фильтруем данные для API (чтобы не отдавать лишнее в JSON)
  // В API лучше жестко скрывать данные, в отличие от UI, где нужен "блюр"
  const responseData = { ...data };

  if (userPlan === PlanName.basic) {
    responseData.affirmation = null;
    responseData.compatibility = null;
    responseData.luckyMetrics = null;
    responseData.tomorrowInsight = null;
  } else if (userPlan === PlanName.plus) {
    responseData.luckyMetrics = null;
    responseData.tomorrowInsight = null;
  }

  return NextResponse.json({ ...responseData, userPlan });
}