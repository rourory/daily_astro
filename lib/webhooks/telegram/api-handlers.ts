import prisma from "@/lib/prisma";
import { UserWithPlan, Translations } from "@/lib/types/webhook/telegram";
import { SubscriptionStatus, PlanName, ZodiacSign } from "@prisma/client";
import { sendMessage } from "./send-message";
import { getTimeKeyboard, getZodiacName } from "./localization-helpers";

export async function handleStart(
  chatId: number,
  user: UserWithPlan,
  t: Translations,
) {
  const sub = user.subscriptions[0];

  if (user.zodiacSign) {
    const signName = getZodiacName(user.zodiacSign, t);

    let subStatus = "";
    if (sub?.status === SubscriptionStatus.active) {
      subStatus = t.Bot.plan_active.replace("{plan}", sub.plan.name);
    } else if (sub?.status === SubscriptionStatus.trial) {
      const date = sub.trialEndsAt
        ? new Date(sub.trialEndsAt).toLocaleDateString(user.locale)
        : "...";
      subStatus = t.Bot.plan_trial.replace("{date}", date);
    }

    const message =
      t.Bot.welcome_back.replace("{sign}", signName) +
      (subStatus ? `\n\n${subStatus}` : "");

    await sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.Bot.settings_btn, callback_data: "settings" }],
        ],
      },
    });
  } else {
    await sendMessage(
      chatId,
      `${t.Bot.welcome_title}\n\n${t.Bot.welcome_text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t.Bot.subscribe_btn,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
              },
            ],
            [{ text: t.Bot.change_zodiac_btn, callback_data: "change_zodiac" }],
          ],
        },
      },
    );
  }
}

// export async function handleSettings(
//   chatId: number,
//   user: UserWithPlan,
//   t: Translations,
// ) {
//   const signName = user.zodiacSign ? getZodiacName(user.zodiacSign, t) : "...";
//   const status = user.isPaused ? t.Bot.status_paused : t.Bot.status_active;
//   const time = user.deliveryTime.slice(0, 5);

//   // Получаем текущее время юзера для отображения
//   let userTimeStr = "";
//   try {
//     userTimeStr = new Date().toLocaleTimeString("ru-RU", {
//       timeZone: user.timezone,
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   } catch (e) {
//     userTimeStr = "??:??";
//   }

//   const text =
//     t.Bot.settings_header
//       .replace("{sign}", signName)
//       .replace("{time}", time)
//       .replace("{status}", status) + `\nВремя у вас: <b>${userTimeStr}</b>`; // Добавили инфо о текущем времени

//   const pauseBtnText = user.isPaused ? t.Bot.resume_btn : t.Bot.pause_btn;

//   await sendMessage(chatId, text, {
//     reply_markup: {
//       inline_keyboard: [
//         // 1. Знак
//         [{ text: t.Bot.change_zodiac_btn, callback_data: "change_zodiac" }],
//         // 2. Язык и Часовой пояс (в один ряд для экономии места)
//         [
//           { text: t.Bot.change_lang_btn, callback_data: "change_lang" },
//           { text: t.Bot.change_tz_btn, callback_data: "change_tz" },
//         ],
//         // 3. Время доставки (если есть в messages)
//         t.Bot.change_time_btn
//           ? [{ text: t.Bot.change_time_btn, callback_data: "change_time" }]
//           : [],
//         // 4. Пауза
//         [{ text: pauseBtnText, callback_data: "toggle_pause" }],
//         // 5. Отмена
//         [{ text: t.Bot.cancel_sub_btn, callback_data: "cancel_sub" }],
//       ].flat(), // flat нужен, чтобы убрать пустые массивы, если кнопки скрыты
//     },
//   });
// }

export async function handleSettings(
  chatId: number,
  user: UserWithPlan,
  t: Translations,
) {
  // Безопасное получение имени знака (на случай если zodiacSign null или перевод сломался)
  const signName = user.zodiacSign ? getZodiacName(user.zodiacSign, t) : "...";

  const status = user.isPaused ? t.Bot.status_paused : t.Bot.status_active;

  // Обрезаем секунды 07:30:00 -> 07:30
  const time = user.deliveryTime
    ? String(user.deliveryTime).slice(0, 5)
    : "07:30";

  // Получаем текущее время юзера
  let userTimeStr = "";
  try {
    userTimeStr = new Date().toLocaleTimeString("ru-RU", {
      timeZone: user.timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    userTimeStr = "??:??";
  }

  const text = t.Bot.settings_header
    .replace("{sign}", signName)
    .replace("{time}", time)
    .replace("{status}", status)
    .replace("{userTimeStr}", userTimeStr); // Добавляем в шаблон

  const pauseBtnText = user.isPaused ? t.Bot.resume_btn : t.Bot.pause_btn;

  // Формируем клавиатуру ПРАВИЛЬНО
  const keyboardRows = [
    // Ряд 1: Сменить знак
    [{ text: t.Bot.change_zodiac_btn, callback_data: "change_zodiac" }],

    // Ряд 2: Язык и Часовой пояс
    [
      { text: t.Bot.change_lang_btn, callback_data: "change_lang" },
      { text: t.Bot.change_tz_btn, callback_data: "change_tz" },
    ],

    // Ряд 3: Время доставки (только если текст кнопки существует в JSON)
    t.Bot.change_time_btn
      ? [{ text: t.Bot.change_time_btn, callback_data: "change_time" }]
      : null, // null будет отфильтрован

    // Ряд 4: Пауза
    [{ text: pauseBtnText, callback_data: "toggle_pause" }],
    user.subscriptions[0].status === SubscriptionStatus.active ||
    user.subscriptions[0].status === SubscriptionStatus.trial
      ? // Ряд 5: Отмена подписки
        [{ text: t.Bot.cancel_sub_btn, callback_data: "cancel_sub" }]
      : [
          {
            text: t.Bot.subscribe_btn,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?telegramId=${user.telegramId}`,
          },
        ],
  ];

  // Убираем null/undefined/пустые массивы, чтобы структура осталась Array<Array<Button>>
  const cleanKeyboard = keyboardRows.filter(
    (row): row is Array<{ text: string; callback_data: string }> =>
      Array.isArray(row) && row.length > 0,
  );

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: cleanKeyboard,
    },
  });
}

export async function handlePlan(
  chatId: number,
  user: UserWithPlan,
  t: Translations,
) {
  const sub = user.subscriptions[0];
  let current = t.Bot.no_sub;

  if (sub) {
    if (sub.status === SubscriptionStatus.active) current = `${sub.plan.name}`;
    if (sub.status === SubscriptionStatus.trial) current = "Trial";
  }

  const text =
    t.Bot.plan_info_header.replace("{current}", current) +
    "\n\n" +
    t.Bot.plan_info_body;

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: t.Bot.subscribe_btn,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?telegramId=${user.telegramId}`,
          },
        ],
      ],
    },
  });
}

// Проверка прав и показ клавиатуры времени
export async function handleTimeSelectionPrompt(
  chatId: number,
  user: UserWithPlan,
  t: Translations,
) {
  const sub = user.subscriptions[0];
  console.log("Проверяем подписку для выбора времени:", {
    hasSubscription: !!sub,
    subscriptionStatus: sub?.status,
    planName: sub?.plan.name,
  });
  // Проверяем, есть ли подписка Premium
  const isPremium =
    (sub?.status === SubscriptionStatus.active &&
      sub.plan.name === PlanName.premium) ||
    (sub?.status === SubscriptionStatus.trial &&
      sub.plan.name === PlanName.premium);

  console.log(`Пользователь ${user.email} имеет Premium:`, isPremium);

  // Если это админ/тест или Premium — разрешаем (можно убрать true для строгого режима)
  if (isPremium) {
    await sendMessage(chatId, t.Bot.select_time_text, {
      reply_markup: getTimeKeyboard(),
    });
  } else {
    // Если нет премиума — предлагаем купить
    await sendMessage(chatId, t.Bot.premium_only, {
      reply_markup: {
        inline_keyboard: [[{ text: t.Bot.no_back, callback_data: "settings" }]],
      },
    });
  }
}

// Сохранение времени
export async function handleTimeUpdate(
  chatId: number,
  telegramId: bigint,
  timeStr: string,
  t: Translations,
) {
  // Простая валидация формата HH:00
  if (!/^([0-1]?[0-9]|2[0-3]):00$/.test(timeStr)) return;

  // Добавляем секунды для формата БД Time (09:00 -> 09:00:00)
  const dbTime = `${timeStr}:00`;

  await prisma.user.update({
    where: { telegramId },
    data: { deliveryTime: dbTime },
  });

  await sendMessage(chatId, t.Bot.time_updated.replace("{time}", timeStr), {
    reply_markup: {
      inline_keyboard: [
        [{ text: t.Bot.settings_btn, callback_data: "settings" }],
      ],
    },
  });
}

export async function handleZodiacSelection(
  chatId: number,
  telegramId: bigint,
  zodiacKey: string,
  t: Translations,
) {
  const isValid = t.Common.zodiac_signs_array.some((z) => z.id === zodiacKey);
  if (!isValid) return;

  const prismaSignLower = zodiacKey.toLowerCase() as ZodiacSign;

  await prisma.user.update({
    where: { telegramId: telegramId },
    data: { zodiacSign: prismaSignLower },
  });

  const signName = getZodiacName(zodiacKey, t);
  const text = t.Bot.sign_selected.replace("{sign}", signName);

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: t.Bot.subscribe_btn,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?telegramId=${telegramId}`,
          },
        ],
      ],
    },
  });
}
