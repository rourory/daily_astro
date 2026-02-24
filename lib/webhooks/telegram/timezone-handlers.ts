import { Translations, userInclude } from "@/lib/types/webhook/telegram";
import { sendMessage } from "./send-message";
import prisma from "@/lib/prisma";
import { getTimezoneKeyboard } from "./localization-helpers";

export async function handleTimezonePrompt(chatId: number, t: Translations) {
  await sendMessage(chatId, t.Bot.select_tz_text, {
    reply_markup: getTimezoneKeyboard(),
  });
}

export async function handleTimezoneUpdate(
  chatId: number,
  telegramId: bigint,
  timezone: string,
  t: Translations,
) {
  // Простая проверка (можно усложнить через Intl)
  try {
    // Проверяем валидность таймзоны
    new Date().toLocaleString("en-US", { timeZone: timezone });
  } catch (e) {
    return; // Некорректная таймзона
  }

  const updatedUser = await prisma.user.update({
    where: { telegramId },
    data: { timezone: timezone },
    include: userInclude,
  });

  // Вычисляем локальное время для подтверждения
  const localTime = new Date().toLocaleTimeString(updatedUser.locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  const msg = t.Bot.tz_updated
    .replace("{zone}", timezone)
    .replace("{time}", localTime);

  await sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: t.Bot.settings_btn, callback_data: "settings" }],
      ],
    },
  });
}