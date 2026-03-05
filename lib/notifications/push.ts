// lib/notifications/push.ts
import webpush from "web-push";
import prisma from "@/lib/prisma";

// Инициализация (вызывается один раз при импорте)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Отправляет пуш всем устройствам пользователя
 */
export async function sendPushNotification(userId: string, payload: PushPayload) {
  // 1. Получаем все активные подписки пользователя
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`);
    return;
  }

  const payloadString = JSON.stringify(payload);

  // 2. Отправляем параллельно на все устройства
  const promises = subscriptions.map(async (sub) => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: sub.keys as { p256dh: string; auth: string },
    };

    try {
      await webpush.sendNotification(pushConfig, payloadString);
    } catch (error: any) {
      // 3. Обработка ошибок: если подписка устарела (410 Gone или 404), удаляем её
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`Subscription expired/gone for user ${userId}, deleting...`);
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
      } else {
        console.error("Push send error:", error);
      }
    }
  });

  await Promise.all(promises);
}