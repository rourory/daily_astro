const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function answerCallback(callbackQueryId: string) {
  try {
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      },
    );
  } catch (e) {
    console.error("AnswerCallback Error", e);
  }
}