import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

// Список поддерживаемых языков
export const locales = ["by", "en", "ru", "kk", "zh"];

export default getRequestConfig(async ({ requestLocale }) => {
  // В новых версиях next-intl мы получаем requestLocale как Promise
  let locale = await requestLocale;

  // Если локаль не пришла или её нет в списке разрешенных — выдаем 404
  if (!locale || !locales.includes(locale as any)) notFound();

  return {
    // ВАЖНО: Мы обязаны вернуть locale обратно в конфиг
    locale,
    // Загружаем сообщения. Обрати внимание на путь к папке messages.
    // Если i18n.ts лежит в src/, то путь '../messages' правильный (выход из src в корень).
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
