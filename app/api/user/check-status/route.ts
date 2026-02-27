import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { getMessages } from "@/lib/webhooks/telegram/localization-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.replace("@", "").toLowerCase();

  // Определяем базовую локаль из заголовков или дефолтную
  const defaultLocale = "ru";

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 },
    );
  }

  const userEmail = `@${username}@telegram.web`;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: userEmail }],
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Если юзера нет
    if (!user) {
      return NextResponse.json({
        exists: false,
        isTrialEligible: true,
        hasActiveSubscription: false,
      });
    }

    // Загружаем сообщения на языке пользователя для будущих нужд (если решите возвращать тексты отсюда)
    // const t = await getMessages(user.locale || defaultLocale);

    const lastSub = user.subscriptions[0];
    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.active,
      SubscriptionStatus.trial,
      SubscriptionStatus.grace,
      SubscriptionStatus.paused,
    ];

    // Логика: триал использован, если в истории есть хоть одна запись со статусом trial
    const isTrialUsed = user.subscriptions.some(
      (sub) => sub.status === SubscriptionStatus.trial,
    );

    const hasActiveSubscription =
      lastSub && activeStatuses.includes(lastSub.status);

    return NextResponse.json({
      exists: true,
      hasActiveSubscription: hasActiveSubscription,
      isTrialEligible: !isTrialUsed,
      userLocale: user.locale,
    });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
