import prisma from "@/lib/prisma";
import {
  Translations,
  userInclude,
  UserWithPlan,
} from "@/lib/types/webhook/telegram";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { answerCallback } from "./answer-callback";
import {
  handleZodiacSelection,
  handleSettings,
  handleTimeSelectionPrompt,
  handleTimeUpdate,
} from "./api-handlers";
import {
  handleLanguagePrompt,
  handleLanguageUpdate,
} from "./language-handlers";
import { getZodiacKeyboard } from "./localization-helpers";
import { sendMessage } from "./send-message";
import {
  handleTimezonePrompt,
  handleTimezoneUpdate,
} from "./timezone-handlers";
import {
  PaymentService,
  PlanService,
  SubscriptionService,
} from "@/lib/dal/services";
import { createAutoPayment } from "@/lib/payment/yookassa";

export async function handleButton(
  data: string, // data обычно string, а не any
  user: UserWithPlan,
  chatId: number,
  t: Translations,
  body: any,
) {
  // 1. Снимаем "часики" с кнопки
  if (body.callback_query?.id) {
    await answerCallback(body.callback_query.id);
  }
  
  // === ЛОГИКА РОУТИНГА ===

  // 2. Обработка start_menu (из API подписки)
  // Мы просто перенаправляем на настройки или приветствие
  if (data === "start_menu") {
    await handleSettings(chatId, user, t);
    return;
  }

  if (data.startsWith("zodiac_")) {
    const sign = data.replace("zodiac_", "");
    if (user.telegramId) {
      await handleZodiacSelection(chatId, user.telegramId, sign, t);
    }
  } else if (data === "settings") {
    await handleSettings(chatId, user, t);
  } else if (data === "change_zodiac") {
    await sendMessage(chatId, t.Bot.choose_sign, {
      reply_markup: getZodiacKeyboard(t),
    });
  } else if (data === "change_lang") {
    await handleLanguagePrompt(chatId, t);
  } else if (data.startsWith("lang_")) {
    const langCode = data.replace("lang_", "");
    if (user.telegramId) {
      await handleLanguageUpdate(chatId, user.telegramId, langCode);
    }
  } else if (data === "change_tz") {
    await handleTimezonePrompt(chatId, t);
  } else if (data.startsWith("tz_")) {
    const tz = data.replace("tz_", "");
    if (user.telegramId) {
      await handleTimezoneUpdate(chatId, user.telegramId, tz, t);
    }
  } else if (data === "change_time") {
    await handleTimeSelectionPrompt(chatId, user, t);
  } else if (data.startsWith("time_")) {
    const time = data.replace("time_", "");
    if (user.telegramId) {
      await handleTimeUpdate(chatId, user.telegramId, time, t);
    }
  }

  // 3. Улучшенная логика Паузы
  else if (data === "toggle_pause") {
    const newUser = await prisma.user.update({
      where: { id: user.id },
      data: { isPaused: !user.isPaused },
      include: userInclude,
    });

    // Вместо отправки отдельного сообщения "Готово", мы заново рендерим Настройки.
    // Это обновит статус (Активна/На паузе) и текст кнопки (Приостановить/Возобновить)
    await handleSettings(chatId, newUser, t);

    // Опционально: можно отправить всплывающее уведомление (toast)
    // await answerCallback(body.callback_query.id, newUser.isPaused ? t.Bot.pause_done : t.Bot.resume_done);
  } else if (data === "cancel_sub") {
    await sendMessage(chatId, t.Bot.cancel_confirm, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.Bot.yes_cancel, callback_data: "confirm_cancel" }],
          [{ text: t.Bot.no_back, callback_data: "settings" }],
        ],
      },
    });
  } else if (data === "confirm_cancel") {
    const sub = user.subscriptions[0]; // Берем последнюю активную, логику выбора можно уточнить
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.canceled,
          canceledAt: new Date(),
        },
      });
      const date = sub.renewAt
        ? new Date(sub.renewAt).toLocaleDateString(user.locale)
        : "...";
      await sendMessage(chatId, t.Bot.sub_canceled.replace("{date}", date));
    }
  } else if (data === "confirm_payment") {
    const pendingSub = await SubscriptionService.findPendingByUser(user.id);
    if (pendingSub && pendingSub.paymentToken) {
      const pendingPayment = (
        await PaymentService.findBySubscriptionId(pendingSub.id)
      )[0];
      const plan = await PlanService.findById(pendingSub.planId);

      switch (pendingSub.paymentProvider) {
        case "yookassa":
          const response = await createAutoPayment(
            pendingSub.priceAmount / 100,
            pendingSub.paymentToken,
            `Возобновление подписки ${plan?.name}`,
            {
              subscriptionId: pendingSub.id,
              userId: pendingSub.userId,
              isRecurring: "true",
            },
          );
          if (response.paid) {
            await SubscriptionService.update(pendingSub.id, {
              status: SubscriptionStatus.active,
              renewAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            });
            await PaymentService.update(pendingPayment.id, {
              status: PaymentStatus.succeeded,
            });
            await sendMessage(chatId, t.Bot.success);
          }
          break;
        default:
          break;
      }
    }
  } else {
    await sendMessage(chatId, t.Bot.no_sub);
  }
}
