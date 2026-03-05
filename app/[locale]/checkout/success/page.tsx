"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Sparkles,
  PartyPopper,
  ArrowRight,
  Star,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export default function CheckoutSuccessPage() {
  const [showContent, setShowContent] = useState(false);
  const t = useTranslations("SuccessPage");

  // Эффект конфетти
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#6366F1", "#EC4899", "#8B5CF6"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    setTimeout(() => setShowContent(true), 300);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div
        className={`text-center max-w-sm w-full transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Success icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <PartyPopper className="w-5 h-5 text-amber-400" />
          <h1 className="font-serif text-2xl font-medium">
            {t("gratulations")}
          </h1>
          <PartyPopper className="w-5 h-5 text-amber-400 scale-x-[-1]" />
        </div>

        <p className="text-muted-foreground mb-8">
          Подписка успешно оформлена. Ваш персональный гороскоп на сегодня уже
          готов.
        </p>

        {/* Info Card */}
        <div className="glass rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Доступ открыт</p>
              <p className="text-xs text-muted-foreground">
                Все функции приложения теперь доступны без ограничений.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Главная кнопка теперь просто ведет на прогноз */}
          <Button
            size="lg"
            className="w-full py-6 rounded-2xl glow text-base font-semibold"
            asChild
          >
            <Link
              href="/forecast"
              className="flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5 fill-current" />
              Смотреть прогноз
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full py-6 rounded-2xl glass hover:bg-white/5"
            asChild
          >
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
