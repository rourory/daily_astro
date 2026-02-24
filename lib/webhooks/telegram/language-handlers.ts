import { Translations, userInclude } from "@/lib/types/webhook/telegram";
import { sendMessage } from "./send-message";
import { getLanguageKeyboard, getMessages } from "./localization-helpers";
import { SUPPORTED_LOCALES } from "./constants";
import prisma from "@/lib/prisma";

export async function handleLanguagePrompt(chatId: number, t: Translations) {
  await sendMessage(chatId, t.Bot.select_lang_text, {
    reply_markup: getLanguageKeyboard(),
  });
}

export async function handleLanguageUpdate(
  chatId: number,
  telegramId: bigint,
  langCode: string,
) {
  // Валидация
  if (!SUPPORTED_LOCALES.some((l) => l.code === langCode)) return;

  // Обновляем БД
  const updatedUser = await prisma.user.update({
    where: { telegramId },
    data: { locale: langCode },
    include: userInclude,
  });

  // ВАЖНО: Загружаем НОВЫЕ переводы сразу же
  const newT = await getMessages(langCode);

  await sendMessage(chatId, newT.Bot.lang_updated, {
    reply_markup: {
      inline_keyboard: [
        [{ text: newT.Bot.settings_btn, callback_data: "settings" }],
      ],
    },
  });
}