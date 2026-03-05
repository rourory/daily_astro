"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, BellOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// В Next.js переменные окружения доступны через process.env
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// Если API на том же домене, можно оставить пустым или использовать относительный путь
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushManagerProps {
  userId: string;
}

export function PushManager({ userId }: PushManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>("default");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      setPermissionState(Notification.permission);

      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
          setLoading(false);
        });
      });
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

  const subscribeToPush = async () => {
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        throw new Error("Разрешение отклонено");
      }

      const registration = await navigator.serviceWorker.ready;

      if (!PUBLIC_VAPID_KEY) {
        throw new Error("VAPID Public Key не найден");
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      setSubscription(sub);

      await fetch(`${API_URL}/api/user/push-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub,
          userId: userId,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Браузер не поддерживает пуши.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            subscription
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {subscription ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">Ежедневный прогноз</p>
          <p className="text-xs text-muted-foreground truncate">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : subscription ? (
              "Активно"
            ) : (
              "Включить уведомления"
            )}
          </p>
        </div>
      </div>

      {permissionState === "denied" ? (
        <span className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
          Запрещено
        </span>
      ) : (
        <button
          onClick={subscription ? unsubscribeFromPush : subscribeToPush}
          disabled={loading}
          className={cn(
            "h-9 px-4 rounded-xl text-sm font-medium transition-all active:scale-95 whitespace-nowrap shadow-sm",
            loading && "opacity-70 cursor-wait",
            subscription
              ? "bg-muted text-foreground hover:bg-muted/80 border border-border/50"
              : "bg-primary text-primary-foreground hover:bg-primary/90 glow",
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : subscription ? (
            "Выкл"
          ) : (
            "Вкл"
          )}
        </button>
      )}
    </div>
  );
}
