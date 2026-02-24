import { type NextRequest, NextResponse } from "next/server";
import { createSystemLog } from "@/lib/logger-db";
import {
  handleSettings,
  handleStart,
  handlePlan,
} from "@/lib/webhooks/telegram/api-handlers";
import { getMessages } from "@/lib/webhooks/telegram/localization-helpers";
import { sendMessage } from "@/lib/webhooks/telegram/send-message";
import { handleButton } from "@/lib/webhooks/telegram/button-handler";
import { getOrCreateUser } from "@/lib/webhooks/telegram/get-or-create-user";

// === CONFIGURATION ===
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = body.message || body.callback_query?.message;
    const from = body.message?.from || body.callback_query?.from;
    const data = body.callback_query?.data;
    const chatId = message?.chat?.id;
    const telegramId = from?.id;
    const text = body.message?.text;

    if (!chatId || !telegramId) return NextResponse.json({ ok: true });

    // 1. Получаем пользователя (теперь это точно UserWithPlan, а не null)
    const user = await getOrCreateUser(
      telegramId,
      from.username,
      from.language_code,
    );

    // 2. Грузим переводы
    const t = await getMessages(user.locale);

    // 3. Обработка кнопок
    if (data) {
      await handleButton(data, user, chatId, t, body);
    }
    // 4. Обработка команд
    else if (text) {
      if (text === "/start") {
        await handleStart(chatId, user, t);
      } else if (text === "/plan" || text === "/subscription") {
        await handlePlan(chatId, user, t);
      } else if (text === "/settings") {
        await handleSettings(chatId, user, t);
      } else if (text === "/help") {
        await sendMessage(chatId, t.Bot.help_text);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook fatal error:", error);
    await createSystemLog({
      level: "ERROR",
      source: "telegram",
      action: "FatalWebhookError",
      message: String(error),
    });
    return NextResponse.json({ ok: true });
  }
}
