/// <reference lib="webworker" />

// 1. Этот экспорт нужен, чтобы TS считал файл модулем и не ругался на глобальную область видимости
export type {};

// 2. Объявляем типы для self
declare const self: ServiceWorkerGlobalScope;

// 3. Слушаем событие PUSH
self.addEventListener("push", (event) => {
  // Если данных нет, ничего не делаем
  if (!event.data) return;

  try {
    const data = event.data.json();

    const title = data.title || "Daily Astro";
    const body = data.body || "Ваш прогноз готов";
    const icon = "/icon-192.png"; // Убедитесь, что путь верный (из public)
    const url = data.url || "/forecast";

    const options: NotificationOptions = {
      body,
      icon,
      badge: "/icon-72.png", // Иконка для статус-бара Android (белая с прозрачностью)
      data: { url }, // Сохраняем URL, чтобы открыть его по клику
      //@ts-ignore
      vibrate: [100, 200, 100, 1000, 100, 200, 100],
      tag: "daily-astro-forecast", // Чтобы новые уведомления заменяли старые, а не копились
      renotify: true, // Вибрация даже если заменяем старое уведомление
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error processing push event:", err);
  }
});

// 4. Слушаем клик по уведомлению
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Закрываем уведомление

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // 1. Ищем уже открытую вкладку с нашим приложением
        for (const client of clientList) {
          // Если вкладка открыта и это (примерно) наш URL
          if (client.url && "focus" in client) {
            return client.focus(); // Просто фокусируемся на ней
          }
        }

        // 2. Если открытой вкладки нет, открываем новую
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});
