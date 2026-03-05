import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// Убедитесь, что путь к verifySession правильный
import { verifySession } from "@/lib/auth/jwt";
import { SettingsClient } from "@/components/landing/settings-client";

export default async function SettingsPage() {
  // 1. Проверка сессии (Ваш код)
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/settings");
  }

  const session = await verifySession(token);

  if (!session) {
    // Если токен невалиден, редиректим
    redirect("/login?callbackUrl=/settings");
  }

  // session обычно содержит { userId: '...', email: '...' } и т.д.
  // Адаптируйте под структуру вашего объекта session
  const userData = {
    id: session.userId, // В зависимости от того, что возвращает verifySession
    email: session.email,
  };

  // Рендерим клиентский компонент и передаем данные
  return <SettingsClient user={userData} />;
}
