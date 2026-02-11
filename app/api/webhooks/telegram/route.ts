import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSystemLog } from "@/lib/logger-db";
import {
  ZodiacSign,
  SubscriptionStatus,
  ZODIAC_NAMES,
  ZODIAC_SYMBOLS,
} from "@/lib/types/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const fetchCache = "force-no-store";

const BOT_TOKEN = process.env.BOT_TOKEN!;

// Telegram API helper
async function sendMessage(
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
          ...options,
        }),
      },
    );
    const json = await response.json();

    await createSystemLog({
      level: "DEBUG",
      source: "telegram",
      action: "sendMessage",
      message: `sendMessage result for chat ${chatId}`,
      meta: { chatId, ok: json.ok, description: json.description },
    });

    return json;
  } catch (error) {
    await createSystemLog({
      level: "ERROR",
      source: "telegram",
      action: "sendMessage_error",
      message: "Failed to send message",
      meta: { chatId, error: String(error), textPreview: text?.slice(0, 200) },
    });
    throw error;
  }
}

// Answer callback query
async function answerCallback(callbackQueryId: string) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      },
    );

    const json = await res.json();
    await createSystemLog({
      level: "DEBUG",
      source: "telegram",
      action: "answerCallback",
      message: `Answered callback ${callbackQueryId}`,
      meta: { callbackQueryId, ok: json.ok },
    });
    return json;
  } catch (error) {
    await createSystemLog({
      level: "ERROR",
      source: "telegram",
      action: "answerCallback_error",
      message: "Failed to answer callback",
      meta: { callbackQueryId, error: String(error) },
    });
    throw error;
  }
}

// Zodiac keyboard
const ZODIAC_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "♈ Овен", callback_data: "zodiac_aries" },
      { text: "♉ Телец", callback_data: "zodiac_taurus" },
      { text: "♊ Близнецы", callback_data: "zodiac_gemini" },
    ],
    [
      { text: "♋ Рак", callback_data: "zodiac_cancer" },
      { text: "♌ Лев", callback_data: "zodiac_leo" },
      { text: "♍ Дева", callback_data: "zodiac_virgo" },
    ],
    [
      { text: "♎ Весы", callback_data: "zodiac_libra" },
      { text: "♏ Скорпион", callback_data: "zodiac_scorpio" },
      { text: "♐ Стрелец", callback_data: "zodiac_sagittarius" },
    ],
    [
      { text: "♑ Козерог", callback_data: "zodiac_capricorn" },
      { text: "♒ Водолей", callback_data: "zodiac_aquarius" },
      { text: "♓ Рыбы", callback_data: "zodiac_pisces" },
    ],
  ],
};

// Get or create user by telegram ID
async function getOrCreateUser(telegramId: number, username?: string) {
  await createSystemLog({
    level: "DEBUG",
    source: "telegram-webhook",
    action: "getOrCreateUser_start",
    message: "Looking up user",
    meta: { telegramId, username },
  });

  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: {
      subscriptions: {
        where: {
          status: {
            in: [
              SubscriptionStatus.active,
              SubscriptionStatus.trial,
              SubscriptionStatus.grace,
            ],
          },
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // If user doesn't exist, try to find by username (from web registration)
  if (!user && username) {
    const webEmail = `@${username.replace("@", "")}@telegram.web`;
    const webUser = await prisma.user.findFirst({
      where: { email: webEmail },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [
                SubscriptionStatus.active,
                SubscriptionStatus.trial,
                SubscriptionStatus.grace,
              ],
            },
          },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (webUser) {
      // Link telegram ID to existing web user
      user = await prisma.user.update({
        where: { id: webUser.id },
        data: { telegramId: BigInt(telegramId) },
        include: {
          subscriptions: {
            where: {
              status: {
                in: [
                  SubscriptionStatus.active,
                  SubscriptionStatus.trial,
                  SubscriptionStatus.grace,
                ],
              },
            },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      await createSystemLog({
        level: "INFO",
        source: "telegram-webhook",
        action: "linked_web_user",
        message: "Linked telegram ID to existing web user",
        meta: { telegramId, webUserId: webUser.id },
      });
    }
  }

  await createSystemLog({
    level: "DEBUG",
    source: "telegram-webhook",
    action: "getOrCreateUser_end",
    message: "User lookup finished",
    meta: { found: Boolean(user), userId: user?.id },
  });

  return user;
}

// Get today's forecast
async function getTodayForecast(zodiacSign: ZodiacSign) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const forecast = await prisma.forecast.findUnique({
    where: {
      forecastDate_zodiacSign: {
        forecastDate: today,
        zodiacSign,
      },
    },
  });

  if (forecast) {
    await createSystemLog({
      level: "DEBUG",
      source: "forecast",
      action: "getTodayForecast_found",
      message: "Forecast found in DB",
      meta: { zodiacSign, forecastId: forecast.id },
    });
    return forecast;
  }

  await createSystemLog({
    level: "INFO",
    source: "forecast",
    action: "getTodayForecast_template",
    message: "No forecast generated yet, returning template",
    meta: { zodiacSign },
  });

  // Return template forecast if none generated
  return {
    love: "Сегодня звёзды благоприятствуют романтике. Будьте открыты к новым знакомствам.",
    money: "Хороший день для финансовых решений. Доверяйте интуиции.",
    mood: "Энергия дня направлена на творчество и самовыражение.",
    advice: "Найдите время для себя — даже 10 минут тишины зарядят вас силой.",
  };
}

// Handle /start command
async function handleStart(
  chatId: number,
  telegramId: number,
  username?: string,
) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleStart_enter",
    message: "Handling /start command",
    meta: { chatId, telegramId, username },
  });

  const user = await getOrCreateUser(telegramId, username);

  try {
    if (user && user.zodiacSign) {
      const sign = user.zodiacSign as ZodiacSign;
      const signName = ZODIAC_NAMES[sign] || sign;
      const symbol = ZODIAC_SYMBOLS[sign] || "⭐";

      let statusText = "";
      const sub = user.subscriptions[0];
      if (sub?.status === SubscriptionStatus.active) {
        statusText = `\n\nПодписка: <b>${sub.plan.name}</b>`;
      } else if (sub?.status === SubscriptionStatus.trial) {
        const trialEnd = sub.trialEndsAt
          ? new Date(sub.trialEndsAt).toLocaleDateString("ru-RU")
          : "скоро";
        statusText = `\n\nПробный период до: <b>${trialEnd}</b>`;
      }

      await sendMessage(
        chatId,
        `С возвращением! ${symbol}\n\nВаш знак: <b>${signName}</b>${statusText}\n\nИспользуйте /forecast чтобы получить прогноз на сегодня.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Получить прогноз на сегодня",
                  callback_data: "get_forecast",
                },
              ],
              [{ text: "Настройки", callback_data: "settings" }],
            ],
          },
        },
      );

      await createSystemLog({
        level: "INFO",
        source: "telegram-webhook",
        action: "handleStart_returning_user",
        message: "Returned welcome back message",
        meta: { userId: user.id, zodiac: user.zodiacSign },
      });
    } else {
      // New user - create with telegram ID
      if (!user) {
        const created = await prisma.user.create({
          data: {
            email: `@${username?.replace("@", "")}@telegram.web`,
            telegramId: BigInt(telegramId),
            timezone: "Europe/Minsk",
            locale: "ru",
            deliveryTime: "07:30:00",
            isPaused: false,
          },
        });

        await createSystemLog({
          level: "INFO",
          source: "telegram-webhook",
          action: "handleStart_new_user",
          message: "Created new user",
          meta: { telegramId, userId: created.id },
        });
      }

      await sendMessage(
        chatId,
        `<b>Добро пожаловать в Daily Astro!</b>\n\nЯ буду присылать вам персональный гороскоп каждое утро.\n\nВыберите ваш знак зодиака:`,
        { reply_markup: ZODIAC_KEYBOARD },
      );
    }
  } catch (error) {
    await createSystemLog({
      level: "ERROR",
      source: "telegram-webhook",
      action: "handleStart_error",
      message: "Error in handleStart",
      meta: { error: String(error), chatId, telegramId },
    });
    throw error;
  }
}

// Handle /forecast command
async function handleForecast(
  chatId: number,
  telegramId: number,
  username?: string,
) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleForecast_enter",
    message: "User requested forecast",
    meta: { chatId, telegramId, username },
  });

  const user = await getOrCreateUser(telegramId, username);

  if (!user || !user.zodiacSign) {
    await createSystemLog({
      level: "WARN",
      source: "telegram-webhook",
      action: "handleForecast_no_zodiac",
      message: "User requested forecast but has no zodiac",
      meta: { chatId, telegramId },
    });

    await sendMessage(chatId, "Сначала выберите знак зодиака. Нажмите /start");
    return;
  }

  const forecast = await getTodayForecast(user.zodiacSign as ZodiacSign);
  const signName =
    ZODIAC_NAMES[user.zodiacSign as ZodiacSign] || user.zodiacSign;
  const symbol = ZODIAC_SYMBOLS[user.zodiacSign as ZodiacSign] || "⭐";
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  const message = `${symbol} <b>Прогноз для ${signName}</b>\n${today}\n\n<b>Любовь</b>\n${forecast.love}\n\n<b>Деньги</b>\n${forecast.money}\n\n<b>Настроение</b>\n${forecast.mood}\n\n<b>Совет дня</b>\n${forecast.advice}\n\n━━━━━━━━━━━━━━━\nПрогнозы приходят ежедневно в 07:30`;

  await sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Изменить знак", callback_data: "change_zodiac" }],
      ],
    },
  });

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleForecast_sent",
    message: "Forecast sent to user",
    meta: { chatId, userId: user.id, zodiac: user.zodiacSign },
  });
}

// Handle /plan command
async function handlePlan(
  chatId: number,
  telegramId: number,
  username?: string,
) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handlePlan_enter",
    message: "User requested plan info",
    meta: { chatId, telegramId, username },
  });

  const user = await getOrCreateUser(telegramId, username);
  const sub = user?.subscriptions[0];

  let currentPlan = "Нет активной подписки";
  if (sub?.status === SubscriptionStatus.active) {
    currentPlan = `${sub.plan.name} (активна)`;
  } else if (sub?.status === SubscriptionStatus.trial) {
    const trialEnd = sub.trialEndsAt
      ? new Date(sub.trialEndsAt).toLocaleDateString("ru-RU")
      : "скоро";
    currentPlan = `Пробный период (до ${trialEnd})`;
  } else if (sub?.status === SubscriptionStatus.grace) {
    currentPlan = "Льготный период (требуется оплата)";
  }

  await sendMessage(
    chatId,
    `<b>Ваш тариф:</b> ${currentPlan}\n\n<b>Доступные тарифы:</b>\n\n<b>Базовый</b> — 3 BYN/мес\nЕжедневный прогноз по 4 сферам\n\n<b>Плюс</b> — 6 BYN/мес\n+ Совместимость дня + Аффирмации\n\n<b>Премиум</b> — 12 BYN/мес\n+ Важные даты + Гибкое время`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Оформить подписку",
              url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
            },
          ],
          [{ text: "Отменить подписку", callback_data: "cancel_sub" }],
        ],
      },
    },
  );

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handlePlan_sent",
    message: "Plan info sent",
    meta: { chatId, userId: user?.id },
  });
}

// Handle /settings command
async function handleSettings(
  chatId: number,
  telegramId: number,
  username?: string,
) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleSettings_enter",
    message: "User opened settings",
    meta: { chatId, telegramId, username },
  });

  const user = await getOrCreateUser(telegramId, username);

  if (!user) {
    await createSystemLog({
      level: "WARN",
      source: "telegram-webhook",
      action: "handleSettings_no_user",
      message: "Settings opened but user not registered",
      meta: { chatId, telegramId },
    });

    await sendMessage(chatId, "Сначала зарегистрируйтесь. Нажмите /start");
    return;
  }

  const signName = user.zodiacSign
    ? ZODIAC_NAMES[user.zodiacSign as ZodiacSign]
    : "Не выбран";
  const deliveryTime = user.deliveryTime || "07:30";
  const deliveryStatus = user.isPaused ? "Приостановлена" : "Активна";

  await sendMessage(
    chatId,
    `<b>Настройки</b>\n\nЗнак: <b>${signName}</b>\nВремя доставки: <b>${deliveryTime}</b>\nДоставка: <b>${deliveryStatus}</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Изменить знак", callback_data: "change_zodiac" }],
          [
            {
              text: user.isPaused ? "Возобновить доставку" : "Приостановить",
              callback_data: "toggle_pause",
            },
          ],
        ],
      },
    },
  );

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleSettings_sent",
    message: "Settings sent",
    meta: { chatId, userId: user.id },
  });
}

// Handle zodiac selection callback
async function handleZodiacSelection(
  chatId: number,
  telegramId: number,
  zodiacSign: string,
) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleZodiacSelection_enter",
    message: "User selected zodiac",
    meta: { chatId, telegramId, zodiacSign },
  });

  const zodiac = zodiacSign as ZodiacSign;

  const upserted = await prisma.user.upsert({
    where: { telegramId: BigInt(telegramId) },
    update: { zodiacSign: zodiac },
    create: {
      telegramId: BigInt(telegramId),
      zodiacSign: zodiac,
      timezone: "Europe/Minsk",
      locale: "ru",
      deliveryTime: "07:30:00",
      isPaused: false,
    },
  });

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleZodiacSelection_upsert",
    message: "Saved zodiac selection",
    meta: { userId: upserted.id, zodiac },
  });

  const signName = ZODIAC_NAMES[zodiac];
  const symbol = ZODIAC_SYMBOLS[zodiac];

  await sendMessage(
    chatId,
    `${symbol} Отлично! Ваш знак — <b>${signName}</b>\n\nТеперь вы будете получать персональные прогнозы каждое утро в 07:30.\n\nНажмите кнопку ниже, чтобы получить первый прогноз!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Получить прогноз", callback_data: "get_forecast" }],
          [
            {
              text: "Оформить подписку",
              url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
            },
          ],
        ],
      },
    },
  );
}

// Handle pause toggle
async function handleTogglePause(chatId: number, telegramId: number) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleTogglePause_enter",
    message: "Toggling pause",
    meta: { chatId, telegramId },
  });

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) {
    await createSystemLog({
      level: "WARN",
      source: "telegram-webhook",
      action: "handleTogglePause_no_user",
      message: "Tried to toggle pause but user missing",
      meta: { telegramId },
    });
    return;
  }

  const newPaused = !user.isPaused;
  const updated = await prisma.user.update({
    where: { telegramId: BigInt(telegramId) },
    data: { isPaused: newPaused },
  });

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleTogglePause_updated",
    message: "User pause toggled",
    meta: { userId: updated.id, isPaused: updated.isPaused },
  });

  await sendMessage(
    chatId,
    newPaused
      ? "Доставка прогнозов приостановлена. Чтобы возобновить, нажмите /settings"
      : "Доставка прогнозов возобновлена! Ждите прогноз завтра в 07:30",
  );
}

// Handle subscription cancellation
async function handleCancelSubscription(chatId: number, telegramId: number) {
  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleCancelSubscription_enter",
    message: "User initiated subscription cancel",
    meta: { chatId, telegramId },
  });

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: {
      subscriptions: {
        where: {
          status: {
            in: [
              SubscriptionStatus.active,
              SubscriptionStatus.trial,
              SubscriptionStatus.grace,
            ],
          },
        },
        take: 1,
      },
    },
  });

  const sub = user?.subscriptions[0];

  if (!sub) {
    await createSystemLog({
      level: "WARN",
      source: "telegram-webhook",
      action: "handleCancelSubscription_no_sub",
      message: "User tried to cancel but no active subscription",
      meta: { chatId, userId: user?.id },
    });

    await sendMessage(chatId, "У вас нет активной подписки.");
    return;
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.canceled,
      canceledAt: new Date(),
    },
  });

  const endDate = sub.renewAt
    ? new Date(sub.renewAt).toLocaleDateString("ru-RU")
    : "конца оплаченного периода";

  await createSystemLog({
    level: "INFO",
    source: "telegram-webhook",
    action: "handleCancelSubscription_done",
    message: "Subscription canceled",
    meta: { subscriptionId: sub.id, userId: user?.id, endDate },
  });

  await sendMessage(
    chatId,
    `Подписка отменена.\n\nДоступ сохранится до ${endDate}.\n\nМы будем рады видеть вас снова!`,
  );
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await createSystemLog({
      level: "DEBUG",
      source: "telegram-webhook",
      action: "incoming_webhook",
      message: "Received Telegram webhook",
      meta: { bodyType: Object.keys(body)[0] },
    });

    // Handle callback queries (button clicks)
    if (body.callback_query) {
      const callback = body.callback_query;
      const chatId = callback.message.chat.id;
      const telegramId = callback.from.id;
      const data = callback.data;
      const username = callback.from.username;

      await createSystemLog({
        level: "INFO",
        source: "telegram-webhook",
        action: "callback_query_received",
        message: "Callback query received",
        meta: { chatId, telegramId, data, username },
      });

      // Answer callback to remove loading state
      await answerCallback(callback.id);

      if (data.startsWith("zodiac_")) {
        const zodiac = data.replace("zodiac_", "");
        await handleZodiacSelection(chatId, telegramId, zodiac);
      } else if (data === "get_forecast") {
        await handleForecast(chatId, telegramId, username);
      } else if (data === "settings") {
        await handleSettings(chatId, telegramId, username);
      } else if (data === "change_zodiac") {
        await sendMessage(chatId, "Выберите новый знак зодиака:", {
          reply_markup: ZODIAC_KEYBOARD,
        });
      } else if (data === "toggle_pause") {
        await handleTogglePause(chatId, telegramId);
      } else if (data === "cancel_sub") {
        await sendMessage(
          chatId,
          "Вы уверены, что хотите отменить подписку?\n\nДоступ сохранится до конца оплаченного периода.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Да, отменить", callback_data: "confirm_cancel" }],
                [{ text: "Нет, оставить", callback_data: "settings" }],
              ],
            },
          },
        );
      } else if (data === "confirm_cancel") {
        await handleCancelSubscription(chatId, telegramId);
      }

      return NextResponse.json({ ok: true });
    }

    // Handle messages
    if (body.message) {
      const message = body.message;
      const chatId = message.chat.id;
      const telegramId = message.from.id;
      const username = message.from.username;
      const text = message.text?.trim() || "";

      await createSystemLog({
        level: "DEBUG",
        source: "telegram-webhook",
        action: "message_received",
        message: "Incoming message",
        meta: {
          chatId,
          telegramId,
          username,
          textPreview: text?.slice(0, 200),
        },
      });

      // Command handlers
      if (text === "/start") {
        await handleStart(chatId, telegramId, username);
      } else if (text === "/forecast" || text === "/horoscope") {
        await handleForecast(chatId, telegramId, username);
      } else if (text === "/plan" || text === "/subscription") {
        await handlePlan(chatId, telegramId, username);
      } else if (text === "/settings") {
        await handleSettings(chatId, telegramId, username);
      } else if (text === "/pause") {
        await handleTogglePause(chatId, telegramId);
      } else if (text === "/cancel") {
        await handleCancelSubscription(chatId, telegramId);
      } else if (text === "/help") {
        await sendMessage(
          chatId,
          `<b>Доступные команды:</b>\n\n/start — Начать работу с ботом\n/forecast — Прогноз на сегодня\n/plan — Информация о подписке\n/settings — Настройки\n/pause — Приостановить доставку\n/cancel — Отменить подписку\n/help — Эта справка\n\nПоддержка: @dailyastro_support`,
        );
      } else {
        await createSystemLog({
          level: "WARN",
          source: "telegram-webhook",
          action: "unknown_command",
          message: "User sent unknown command or text",
          meta: { chatId, telegramId, textPreview: text?.slice(0, 200) },
        });

        await sendMessage(
          chatId,
          "Используйте /forecast для получения прогноза или /help для списка команд.",
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await createSystemLog({
      level: "ERROR",
      source: "telegram-webhook",
      action: "webhook_error",
      message: "Telegram webhook error",
      meta: { error: String(error) },
    });
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
