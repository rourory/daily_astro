"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  LockKeyhole,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/navigation"; // Или import Link from "next/link" если не используете i18n роутинг

// Иконка "Вход", которую вы просили ранее
const LoginIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Шаги: 1 = Email, 2 = OTP
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Для таймера повторной отправки
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Авто-сабмит кода при вводе 6 цифр
  useEffect(() => {
    if (step === 2 && otpCode.length === 6) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendOtp = async () => {
    if (!isValidEmail(email)) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки кода");

      setStep(2);
      setResendTimer(30); // 30 секунд до повторной отправки
    } catch (err: any) {
      setError(err.message || "Не удалось отправить код");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Проверяем код и логиним
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Неверный код");

      // 2. Успешный вход -> редирект
      // Проверяем, куда пользователь хотел попасть изначально
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
      router.refresh(); // Обновляем сессию на клиенте
    } catch (err: any) {
      setError(err.message || "Ошибка проверки кода");
      setOtpCode(""); // Очищаем поле при ошибке для удобства
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        {/* Хедер карточки */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary glow">
            {step === 1 ? (
              <LoginIcon className="w-8 h-8" />
            ) : (
              <LockKeyhole className="w-8 h-8" />
            )}
          </div>
          <h1 className="font-serif text-3xl font-medium mb-2">
            {step === 1 ? "Вход в аккаунт" : "Код из письма"}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 ? (
              "Введите ваш email для получения доступа"
            ) : (
              <>
                Мы отправили код на{" "}
                <span className="text-foreground font-medium">{email}</span>
              </>
            )}
          </p>
        </div>

        {/* Контент формы */}
        <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="pl-1">Email адрес</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 rounded-2xl text-base bg-white/5 border-white/10 focus:bg-white/10 transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={!isValidEmail(email) || isLoading}
                className="w-full h-14 rounded-2xl text-base font-semibold glow transition-all active:scale-[0.98]"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Продолжить"
                )}
                {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              {/* OTP Input Slots */}
              <div className="relative w-full max-w-[320px] mx-auto">
                <input
                  autoComplete="one-time-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                    if (error) setError(null);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 font-mono"
                  disabled={isLoading}
                  autoFocus
                />

                <div className="flex justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const isActive = otpCode.length === index;
                    const isFilled = otpCode.length > index;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "w-10 h-14 sm:w-12 sm:h-16 rounded-xl border flex items-center justify-center text-2xl font-bold transition-all duration-200 relative bg-background/50",
                          isActive
                            ? "border-primary ring-2 ring-primary/20 scale-105 z-10 bg-background shadow-lg"
                            : "border-input/30",
                          isFilled &&
                            "bg-muted/30 border-primary/50 text-foreground",
                          error && "border-red-500/50 bg-red-500/5",
                        )}
                      >
                        <span className="font-mono">{otpCode[index]}</span>
                        {isActive && !isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-0.5 h-6 bg-primary animate-pulse rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length < 6 || isLoading}
                  className="w-full h-14 rounded-2xl text-base font-semibold glow"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Войти"
                  )}
                </Button>

                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpCode("");
                      setError(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-2"
                  >
                    <ArrowLeft className="w-3 h-3" /> Другая почта
                  </button>

                  <button
                    type="button"
                    disabled={resendTimer > 0 || isLoading}
                    onClick={handleSendOtp}
                    className={cn(
                      "text-xs flex items-center gap-1 py-2 transition-colors",
                      resendTimer > 0
                        ? "text-muted-foreground cursor-wait"
                        : "text-primary hover:text-primary/80",
                    )}
                  >
                    {resendTimer > 0 ? (
                      `Отправить снова через ${resendTimer}с`
                    ) : (
                      <>
                        Отправить снова <RefreshCw className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Футер или ссылка на регистрацию */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link
              href="/subscribe"
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              Оформить подписку
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
