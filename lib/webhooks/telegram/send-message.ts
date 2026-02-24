const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { reply_markup?: object },
) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...options,
        }),
      },
    );
    const json = await response.json();
    if (!json.ok) {
      // Логируем ошибку API, но не прерываем выполнение
      console.error(`Telegram API Error: ${json.description}`);
    }
    return json;
  } catch (error) {
    console.error("SendMessage Error:", error);
  }
}