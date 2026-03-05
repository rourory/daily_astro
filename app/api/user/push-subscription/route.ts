import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { type PushSubscription } from "web-push";

export async function POST(req: Request) {
  try {
    // В реальном приложении здесь нужно получить userId из сессии/токена
    // Для примера берем из body, но это небезопасно для продакшена без проверки auth
    const { subscription, userId, userAgent } = await req.json();

    if (!subscription || !subscription.endpoint || !userId) {
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