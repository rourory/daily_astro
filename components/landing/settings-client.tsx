"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  User,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/lib/navigation"; // Или "next/link", если не используете next-intl
import { PushManager } from "@/components/push-manager";

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    // Добавьте другие поля, если они есть в session
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Предполагаем, что есть API роут для выхода
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh(); // Обновляем данные
      router.push("/login"); // Редирект
    } catch (error) {
      console.error("Logout failed", error);
      // Фолбэк редирект
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3 flex items-center gap-4 border-b border-border/40">
        <Link
          href="/forecast" // Или "/"
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
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="p-4">
              {/* Передаем ID пользователя */}
              <PushManager userId={user.id} />
            </div>

            <div className="px-4 py-3 bg-muted/30 border-t border-border/50 text-[11px] text-muted-foreground leading-snug">
              Включите, чтобы получать персональный гороскоп каждое утро.
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
