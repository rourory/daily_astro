import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

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

  const email = payload.email;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          where: {
            status: { in: ["active", "trial"] },
            renewAt: { gt: new Date() }, // Подписка еще не истекла
          },
        },
        payments: true, // Чтобы проверить, были ли платежи (для триала)
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isTrialEligible: true, // Новый пользователь -> положен триал
        hasActiveSubscription: false,
      });
    }

    // Проверяем право на триал
    // Если были успешные платежи ИЛИ были подписки ранее -> триал недоступен
    const hasSuccessfulPayments = user.payments.some(
      (p) => p.status === "succeeded",
    );
    // Можно добавить логику проверки прошлых подписок со статусом trial/expired

    const isTrialEligible = !hasSuccessfulPayments;
    const hasActiveSubscription = user.subscriptions.length > 0;

    return NextResponse.json({
      exists: true,
      isTrialEligible,
      hasActiveSubscription,
    });
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
