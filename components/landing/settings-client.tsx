// components/landing/settings-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  User,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Mail,
  Loader2,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { PushManager } from "@/components/push-manager";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    emailNotification: boolean; // Обязательное поле для пропсов
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();

  // Локальные состояния для Email-переключателя
  const [isEmailEnabled, setIsEmailEnabled] = useState(user.emailNotification);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      router.push("/login");
    }
  };

  const toggleEmailNotifications = async () => {
    setIsEmailLoading(true);
    const newValue = !isEmailEnabled;

    try {
      const res = await fetch("/api/user/settings/email-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          emailNotification: newValue,
        }),
      });

      if (!res.ok) throw new Error("Ошибка при обновлении настроек");

      // Оптимистично обновляем UI
      setIsEmailEnabled(newValue);

      // Вызываем refresh, чтобы Next.js обновил серверные данные в фоне
      router.refresh();
    } catch (error) {
      console.error("Failed to update email notifications", error);
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3 flex items-center gap-4 border-b border-border/40">
        <Link
          href="/forecast"
          className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-serif text-lg font-medium">Настройки</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Profile Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl glass border border-border/50 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-medium text-lg truncate">
              {user.email || "Пользователь"}
            </h2>
            <p className="text-xs text-muted-foreground font-mono truncate">
              ID: {user.id ? user.id.slice(0, 8) : "..."}
            </p>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-3">
            Уведомления
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm flex flex-col divide-y divide-border/50">
            {/* Блок Push */}
            <div className="p-4">
              <PushManager userId={user.id} />
            </div>

            {/* Блок Email */}
            <div className="p-4 flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isEmailEnabled
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">Email рассылка</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isEmailEnabled ? "Активно" : "Выключено"}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleEmailNotifications}
                disabled={isEmailLoading}
                className={cn(
                  "h-9 px-4 rounded-xl text-sm font-medium transition-all active:scale-95 whitespace-nowrap shadow-sm",
                  isEmailLoading && "opacity-70 cursor-wait",
                  isEmailEnabled
                    ? "bg-muted text-foreground hover:bg-muted/80 border border-border/50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 glow",
                )}
              >
                {isEmailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEmailEnabled ? (
                  "Выкл"
                ) : (
                  "Вкл"
                )}
              </button>
            </div>

            {/* Футер карточки уведомлений */}
            <div className="px-4 py-3 bg-muted/30 text-[11px] text-muted-foreground leading-snug">
              Настройте удобные каналы, чтобы получать персональный гороскоп
              каждое утро.
            </div>
          </div>
        </div>

        {/* Application Info */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-3">
            Приложение
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden divide-y divide-border/50 shadow-sm">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">
                  Политика конфиденциальности
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">О приложении</span>
              </div>
              <span className="text-xs text-muted-foreground mr-1">v1.0.0</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-14 mt-8 rounded-2xl bg-destructive/5 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" /> Выйти из аккаунта
        </button>
      </main>
    </div>
  );
}
