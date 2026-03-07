import { NextResponse } from "next/server";
// Импортируйте ваш клиент Prisma (путь может отличаться)
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function PATCH(req: Request) {
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
    const body = await req.json();
    const { emailNotification } = body;

    // Валидация
    if (!userId || typeof emailNotification !== "boolean") {
      return NextResponse.json(
        { error: "Неверные данные запроса" },
        { status: 400 },
      );
    }

    // Обновляем пользователя в базе данных
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailNotification: emailNotification,
      },
      select: {
        id: true,
        emailNotification: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating email notification settings:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
