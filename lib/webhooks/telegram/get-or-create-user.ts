import { createSystemLog } from "@/lib/logger-db";
import prisma from "@/lib/prisma";
import { UserWithPlan, userInclude } from "@/lib/types/webhook/telegram";
import { DEFAULT_LOCALE } from "./constants";

export async function getOrCreateUser(
  telegramId: number,
  username?: string,
  languageCode?: string,
): Promise<UserWithPlan> {
  // 1. Пытаемся найти
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: userInclude, // Используем общий объект Include
  });

  // 2. Если нет, ищем по username (связка с сайтом)
  if (!user && username) {
    const webEmail = `@${username.replace("@", "")}@telegram.web`;
    const webUser = await prisma.user.findFirst({
      where: { email: webEmail },
    });

    if (webUser) {
      user = await prisma.user.update({
        where: { id: webUser.id },
        data: { telegramId: BigInt(telegramId) },
        include: userInclude, // Тот же Include
      });
    }
  }

  // 3. Если все еще нет — создаем
  if (!user) {
    const telegramLocale =
      languageCode && ["ru", "en"].includes(languageCode)
        ? languageCode
        : DEFAULT_LOCALE;

    user = await prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        email: username ? `@${username}@telegram.bot` : null,
        locale: telegramLocale,
        timezone: "Europe/Minsk",
        isPaused: false,
      },
      // ИСПРАВЛЕНИЕ ОШИБКИ 1:
      // Даже при создании (когда подписок нет), мы должны указать include той же структуры,
      // чтобы TypeScript понял, что возвращаемый тип совпадает.
      include: userInclude,
    });

    await createSystemLog({
      level: "INFO",
      source: "telegram",
      action: "UserCreated",
      message: `New user created via bot`,
      meta: { telegramId, locale: telegramLocale },
    });
  }

  // Принудительно говорим TS, что user здесь есть (логика выше это гарантирует)
  return user!;
}