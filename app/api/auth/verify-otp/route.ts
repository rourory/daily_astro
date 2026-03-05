import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, locale } = body;

    if (!email || !code) {
      return NextResponse.json({ error: "Email и код обязательны" }, { status: 400 });
    }

    // 1. Ищем токен верификации в БД
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: code,
        },
      },
    });

    // 2. Проверяем существование токена
    if (!verificationToken) {
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    // 3. Проверяем срок действия
    if (new Date() > verificationToken.expires) {
      // Удаляем просроченный
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token: code } },
      });
      return NextResponse.json({ error: "Код истек" }, { status: 400 });
    }

    // 4. Удаляем использованный токен (защита от повторного использования)
    await prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: email, token: code },
      },
    });

    // 5. Логика пользователя: Найти или Создать
    // Используем upsert не совсем корректно, так как нам нужно получить ID
    // Проще проверить findUnique, и если нет - создать.
    
    let user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      // Создаем нового пользователя.
      // ZodiacSign будет null, остальные поля возьмут @default из схемы.
      user = await prisma.user.create({
        data: {
          email,
          // Можно добавить locale из запроса, если фронт его присылает, например:
          locale: locale || 'ru'
        }
      });
    }

    // 6. Создаем сессию JWT
    const token = await signSession({ 
      userId: user.id, 
      email: user.email 
    });

    // 7. Устанавливаем HttpOnly Cookie
    (await cookies()).set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 40, // 40 дней
      path: "/",
    });

    return NextResponse.json({ success: true, userId: user.id });
    
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}