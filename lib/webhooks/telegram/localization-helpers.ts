import { Translations } from "@/lib/types/webhook/telegram";
import {
  DEFAULT_LOCALE,
  POPULAR_TIMEZONES,
  SUPPORTED_LOCALES,
} from "./constants";

export function getLanguageKeyboard() {
  const buttons = SUPPORTED_LOCALES.map((l) => [
    {
      text: l.label,
      callback_data: `lang_${l.code}`,
    },
  ]);

  return { inline_keyboard: buttons };
}

export function getTimezoneKeyboard() {
  const buttons = POPULAR_TIMEZONES.map((tz) => ({
    text: tz.label,
    callback_data: `tz_${tz.id}`,
  }));

  // Разбиваем по 2 в ряд
  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }

  // Кнопка назад
  keyboard.push([{ text: "🔙 Назад", callback_data: "settings" }]);

  return { inline_keyboard: keyboard };
}

export async function getMessages(locale: string): Promise<Translations> {
  try {
    // ВАЖНО: Убедитесь, что путь правильный относительно папки app/api/forecasts/webhook
    // Если файлы лежат в корне проекта в /messages:
    const messages = (await import(`../../../messages/${locale}.json`)).default;
    return messages;
  } catch (error) {
    console.warn(
      `Locale ${locale} not found, falling back to ${DEFAULT_LOCALE}`,
    );
    try {
      return (await import(`../../../messages/${DEFAULT_LOCALE}.json`)).default;
    } catch (e) {
      console.error("CRITICAL: No translation files found");
      // Возвращаем пустую заглушку, чтобы код не падал совсем
      return {
        Common: { zodiac_signs_array: [] },
        Bot: {},
      } as unknown as Translations;
    }
  }
}

export function getZodiacName(signKey: string, t: Translations): string {
  const signObj = t.Common.zodiac_signs_array.find(
    (s) => s.id.toLowerCase() === signKey.toLowerCase(),
  );
  return signObj ? signObj.name : signKey;
}

export function getZodiacKeyboard(t: Translations) {
  const buttons = t.Common.zodiac_signs_array.map((z) => ({
    text: z.name,
    callback_data: `zodiac_${z.id}`,
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) {
    keyboard.push(buttons.slice(i, i + 3));
  }
  return { inline_keyboard: keyboard };
}

// Генерация клавиатуры времени (05:00 - 21:00)
export function getTimeKeyboard() {
  const buttons = [];
  // С 5 утра до 21 вечера
  for (let hour = 5; hour <= 21; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    buttons.push({
      text: timeStr,
      callback_data: `time_${timeStr}`, // Пример: time_09:00
    });
  }

  // Разбиваем на ряды по 4 кнопки
  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 4) {
    keyboard.push(buttons.slice(i, i + 4));
  }

  // Добавляем кнопку "Назад"
  keyboard.push([{ text: "🔙 Назад", callback_data: "settings" }]);

  return { inline_keyboard: keyboard };
}
