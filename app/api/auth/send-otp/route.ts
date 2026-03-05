import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ваш инстанс призмы
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }

    // 1. Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Устанавливаем время жизни (15 минут)
    const expires = new Date(new Date().getTime() + 15 * 60 * 1000);

    // 3. Сохраняем в БД. Если токен для этого email уже есть — обновляем его.
    // Примечание: Лучше удалять старые токены перед созданием нового, 
    // но upsert по уникальному полю тоже подойдет, если модель позволяет.
    // В нашей схеме unique([identifier, token]), поэтому лучше сначала почистить старые.
    
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires: expires,
      },
    });

    // 4. Отправляем письмо
    await sendOtpEmail(email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Ошибка отправки кода" }, { status: 500 });
  }
}