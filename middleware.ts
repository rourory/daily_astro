import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";
import { verifySession } from "@/lib/auth/jwt";

// Инициализируем middleware для локализации
const handleI18nRouting = createMiddleware(routing);

// Список путей, требующих авторизации
// Важно: не включайте сюда /login, /subscribe и публичные страницы
const PROTECTED_ROUTES_PATTERN = /^\/(ru|en|kk|zh)?\/(dashboard|profile|settings)/;

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Проверяем авторизацию только для защищенных маршрутов
  // Мы проверяем path, игнорируя локаль (если она есть в URL)
  // Регулярка выше проверяет наличие /dashboard и т.д. после локали или в корне
  if (PROTECTED_ROUTES_PATTERN.test(pathname)) {
    const token = req.cookies.get("session_token")?.value;
    
    // Если токена нет - редирект на логин
    if (!token) {
      // Сохраняем локаль, если она была в URL, иначе берем дефолтную (ru)
      const locale = pathname.match(/^\/(ru|en|kk|zh)/)?.[1] || "ru";
      const loginUrl = new URL(`/${locale}/login`, req.url);
      
      // Можно добавить callbackUrl, чтобы вернуть юзера после входа
      loginUrl.searchParams.set("callbackUrl", pathname);
      
      return NextResponse.redirect(loginUrl);
    }

    // Если токен есть, проверяем его валидность
    const payload = await verifySession(token);
    
    if (!payload) {
      // Токен невалиден — удаляем куку и редиректим
      const locale = pathname.match(/^\/(ru|en|kk|zh)/)?.[1] || "ru";
      const response = NextResponse.redirect(new URL(`/${locale}/login`, req.url));
      response.cookies.delete("session_token");
      return response;
    }
  }

  // 2. Если авторизация прошла (или не требуется), запускаем next-intl
  return handleI18nRouting(req);
}

export const config = {
  // Matcher должен захватывать все страницы, кроме API и статики
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};