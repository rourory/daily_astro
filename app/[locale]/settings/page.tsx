// app/settings/page.tsx (или где находится ваша страница)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/jwt";
import { SettingsClient } from "@/components/landing/settings-client";
import prisma from "@/lib/prisma"; // Импорт Prisma клиента

export default async function SettingsPage() {
  // 1. Проверка сессии
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/settings");
  }

  const session = await verifySession(token);

  if (!session || !session.userId) {
    redirect("/login?callbackUrl=/settings");
  }

  // 2. Получаем актуальные данные пользователя из БД,
  const dbUser = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      email: true,
      emailNotification: true, 
    },
  });

  // Если пользователя почему-то нет в БД (например, удален), тоже редирект
  if (!dbUser) {
    redirect("/login?callbackUrl=/settings");
  }
  
  return <SettingsClient user={dbUser} />;
}
