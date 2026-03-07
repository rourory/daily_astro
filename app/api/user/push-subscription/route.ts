import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { type PushSubscription } from "web-push";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function POST(req: Request) {
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

  const userId = payload.userId;

  try {
    // В реальном приложении здесь нужно получить userId из сессии/токена
    // Для примера берем из body, но это небезопасно для продакшена без проверки auth
    const { subscription, userAgent } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Сохраняем или обновляем подписку
    // Используем upsert по endpoint, чтобы не дублировать, если браузер шлет то же самое
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        keys: subscription.keys,
        userAgent: userAgent,
        userId: userId, // На случай, если устройство перешло к другому юзеру (редко, но бывает)
      },
      create: {
        userId: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys as any,
        userAgent: userAgent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save subscription error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
