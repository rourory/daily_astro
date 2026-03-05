"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePwa } from "@/hooks/use-pwa"; // Ваш хук PWA
import IosInstruction from "./ios-instruction"; // Ваша модалка
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Sparkles } from "lucide-react";

interface SmartActionButtonProps {
  isLoggedIn: boolean; // Получаем статус от родителя (Server Component)
  className?: string;
}

export default function SmartPWAActionButton({
  isLoggedIn,
  className,
}: SmartActionButtonProps) {
  const router = useRouter();
  const { isIOS, isInstallable, isStandalone, installApp } = usePwa();
  const [showIosHint, setShowIosHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Пока не сгидрировалось, возвращаем заглушку или null,
  // чтобы не было мерцания контента
  if (!mounted) return null;

  // --- ЛОГИКА ВЫБОРА ДЕЙСТВИЯ ---

  // 1. Если пользователь залогинен -> Ведем на прогноз
  if (isLoggedIn) {
    return (
      <div className={cn("flex w-full items-stretch gap-2", className)}>
        {/* Кнопка Прогноза (Занимает все место) */}
        <Button
          onClick={() => router.push(`/forecast`)} // Добавили локаль для надежности
          size="lg"
          variant="ghost"
          className="flex-1 cursor-pointer text-base py-6 glass hover:bg-white/10 hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
          <span>Посмотреть прогноз</span>
        </Button>

        {/* Кнопка Настроек (Квадратная) */}
        <Button
          onClick={() => router.push(`/settings`)}
          size="lg"
          variant="ghost"
          className="aspect-square h-auto p-0 glass hover:bg-white/10 hover:text-white rounded-2xl transition-all flex items-center justify-center"
          aria-label="Настройки"
        >
          <Settings className="w-6 h-6 text-muted-foreground hover:text-white transition-colors" />
        </Button>
      </div>
    );
  }

  // 2. Если НЕ залогинен и приложение МОЖНО установить -> Предлагаем установку
  // (isInstallable обычно true в Chrome/Safari, если приложение еще не установлено)
  // (isStandalone true, если приложение уже открыто как PWA)
  if (!isStandalone && (isInstallable || isIOS)) {
    const handleInstallClick = () => {
      if (isIOS) {
        setShowIosHint(true);
      } else {
        installApp();
      }
    };

    return (
      <>
        <Button
          onClick={handleInstallClick}
          size="lg"
          variant="ghost"
          className={cn(
            "w-full cursor-pointer hover:text-white text-base py-6 glass hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-2",
            className,
          )}
        >
          {/* Иконка скачивания */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Установить приложение
        </Button>

        <IosInstruction
          isOpen={showIosHint}
          onClose={() => setShowIosHint(false)}
        />
      </>
    );
  }

  // 3. Дефолтное состояние: НЕ залогинен и (уже установлено ИЛИ нельзя установить) -> Кнопка Входа
  return (
    <Button
      onClick={() => router.push("/login")}
      size="lg"
      variant="ghost"
      className={cn(
        "w-full cursor-pointer hover:text-white text-base py-6 glass hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-2",
        className,
      )}
    >
      {/* Иконка входа */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Войти в аккаунт
    </Button>
  );
}
