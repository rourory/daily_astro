"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { ZODIAC_SIGNS } from "@/lib/types/enums";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Star,
  Crown,
  Loader2,
  Globe,
  Clock,
  CreditCard,
  ChevronDown,
  Info,
  Mail,
  LockKeyhole,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/navigation";
import { Currency, Plan, PlanName, PlanPrice } from "@prisma/client";
import { YookassaPaymentModal } from "./payment/yookassa-payment-modal";
import {
  PaymentProviderId,
  SubscribeErrorResponse,
  SubscribeSuccessResponse,
} from "@/app/api/subscribe/route";

// --- Types & Constants ---

type PlanWithPrices = Plan & {
  prices: PlanPrice[];
};

interface I18nPlan {
  id: string;
  name: string;
  features: string[];
}

const SORT_ORDER = [PlanName.basic, PlanName.plus, PlanName.premium];

const UI_CONFIG: Record<string, { icon: any; highlighted: boolean }> = {
  [PlanName.basic]: { icon: Star, highlighted: false },
  [PlanName.plus]: { icon: Sparkles, highlighted: true },
  [PlanName.premium]: { icon: Crown, highlighted: false },
};

const AVAILABLE_LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "kk", label: "Қазақша" },
  { value: "zh", label: "中文" },
];

const TIMEZONES = [
  "Europe/Minsk",
  "Europe/Moscow",
  "Europe/Kiev",
  "Asia/Almaty",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Shanghai",
];

interface PaymentMethodOption {
  value: PaymentProviderId;
  label: string;
  currency: Currency;
  disabled: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: "yookassa",
    label: "YooKassa (RUB)",
    currency: Currency.RUB,
    disabled: false,
  },
  {
    value: "bepaid",
    label: "BePaid (BYN)",
    currency: Currency.BYN,
    disabled: true,
  },
  {
    value: "robokassa",
    label: "Robokassa (KZT)",
    currency: Currency.KZT,
    disabled: true,
  },
];

// --- Helper Component: CustomSelect ---
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  className?: string;
  align?: "left" | "center" | "right";
}

function CustomSelect({
  value,
  onChange,
  options,
  className,
  align = "left",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 flex items-center justify-between px-3 rounded-xl bg-background/50 border border-input text-sm font-medium text-foreground hover:bg-muted/50 transition-all focus:ring-2 focus:ring-primary outline-none"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200 ml-2 shrink-0",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-full min-w-[140px] glass bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-xl overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[240px] overflow-y-auto custom-scrollbar",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setIsOpen(false);
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left",
                value === option.value
                  ? "text-foreground font-medium bg-muted/40"
                  : "text-muted-foreground",
                option.disabled
                  ? "opacity-50 cursor-not-allowed bg-muted/20"
                  : "hover:bg-muted/80 cursor-pointer",
              )}
            >
              <span className="truncate">
                {option.label}
                {option.disabled && " (Скоро)"}
              </span>
              {value === option.value && (
                <Check className="w-4 h-4 text-primary ml-2 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function SubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentLocale = useLocale();
  const t = useTranslations("SubscribePage");
  const tCommon = useTranslations("Common");

  const localizedZodiacSigns = tCommon.raw("zodiac_signs_array") as {
    id: string;
    name: string;
  }[];
  const zodiacSigns = ZODIAC_SIGNS.map((sign) => {
    const localized = localizedZodiacSigns.find((s) => s.id === sign.id);
    return { ...sign, name: localized ? localized.name : sign.id };
  });

  // Steps: 1=Zodiac, 2=Email Details, 3=OTP, 4=Plans/Payment
  const [step, setStep] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [plans, setPlans] = useState<PlanWithPrices[]>([]);

  // Состояние статуса пользователя
  const [userStatus, setUserStatus] = useState<{
    exists: boolean;
    isTrialEligible: boolean;
    hasActiveSubscription: boolean;
  } | null>(null);

  const [showYookassaPaymentModal, setShowYookassaPaymentModal] =
    useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<
    string | null
  >(null);

  const [formData, setFormData] = useState({
    zodiacSign: "",
    email: "",
    otpCode: "",
    plan: "",
    locale: currentLocale,
    timezone: "Europe/Minsk",
    currency: Currency.RUB as Currency,
    paymentProvider: "yookassa" as PaymentProviderId,
  });

  // --- Initial Effects ---

  useEffect(() => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTimezone)
        setFormData((prev) => ({ ...prev, timezone: userTimezone }));
    } catch (e) {
      console.error("Failed to detect timezone", e);
    }
  }, []);

  useEffect(() => {
    const method = PAYMENT_METHODS.find(
      (m) => m.value === formData.paymentProvider,
    );
    if (method) setFormData((prev) => ({ ...prev, currency: method.currency }));
  }, [formData.paymentProvider]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const sorted = (data.plans as PlanWithPrices[]).sort(
          (a, b) => SORT_ORDER.indexOf(a.name) - SORT_ORDER.indexOf(b.name),
        );
        setPlans(sorted);
        const plusPlan = sorted.find((p) => p.name === PlanName.plus);
        if (!searchParams.get("plan") && plusPlan)
          setFormData((prev) => ({ ...prev, plan: plusPlan.id }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsPlansLoading(false);
      }
    }
    fetchPlans();
  }, [searchParams]);

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl && plans.length > 0) {
      const found = plans.find(
        (p) => p.id === planFromUrl || p.name === planFromUrl,
      );
      if (found) setFormData((prev) => ({ ...prev, plan: found.id }));
    }
  }, [searchParams, plans]);

  // --- Helpers ---

  const formatPrice = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat(formData.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // --- Logic Steps ---

  // Шаг 2 -> 3: Отправка OTP
  const handleSendOtp = async () => {
    if (!isValidEmail(formData.email)) return;
    setIsOtpLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ошибка отправки кода");

      setStep(3); // Переход к вводу кода
    } catch (error: any) {
      alert(error.message || "Ошибка отправки кода");
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Шаг 3 -> 4: Проверка OTP и проверка статуса юзера
  const handleVerifyOtp = async () => {
    if (formData.otpCode.length < 4) return;
    setIsOtpLoading(true);
    try {
      // 1. Проверяем код
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code: formData.otpCode }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Неверный код");

      // 2. Если код верен, проверяем статус пользователя (триал или нет)
      await checkUserStatus();

      setStep(4);
    } catch (error: any) {
      alert(error.message || "Ошибка проверки");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const checkUserStatus = async () => {
    try {
      const res = await fetch(
        `/api/user/check-status`,
      );
      if (res.ok) {
        const data = await res.json();
        setUserStatus(data);
      }
    } catch (error) {
      console.error(error);
      // Если ошибка, считаем что пользователь новый (дефолтное поведение)
      setUserStatus({
        exists: false,
        isTrialEligible: true,
        hasActiveSubscription: false,
      });
    }
  };

  // --- Payment Logic (Step 4) ---

  const selectedDbPlan = plans.find((p) => p.id === formData.plan);
  const i18nPlans = t.raw("plans") as I18nPlan[];
  const selectedPlanName = selectedDbPlan
    ? i18nPlans.find((p) => p.id === selectedDbPlan.name)?.name ||
      selectedDbPlan.name
    : "—";

  let selectedPriceDisplay = "—";
  let rawPriceAmount = 0;
  let selectedCurrencyCode = formData.currency;

  if (selectedDbPlan) {
    const priceObj = selectedDbPlan.prices.find(
      (p) => p.currency === formData.currency,
    );
    if (priceObj) {
      selectedCurrencyCode = priceObj.currency;
      selectedPriceDisplay = formatPrice(priceObj.amount, priceObj.currency);
      rawPriceAmount = priceObj.amount;
    }
  }

  // Расчет цены "Сегодня"
  // Если isTrialEligible === true -> цена 0
  // Если isTrialEligible === false -> полная цена
  const isEligibleForTrial = userStatus?.isTrialEligible ?? true;
  const todayAmount = isEligibleForTrial ? 0 : rawPriceAmount;

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const selectedPlanObj = plans.find((p) => p.id === formData.plan);
      if (!selectedPlanObj) throw new Error(t("select_plan_error"));

      const priceObj = selectedPlanObj.prices.find(
        (p) => p.currency === formData.currency,
      );
      if (!priceObj)
        throw new Error(`Price not found for currency ${formData.currency}`);

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          zodiac_sign: formData.zodiacSign,
          plan_id: formData.plan,
          locale: formData.locale,
          timezone: formData.timezone,
          currency: formData.currency,
          paymentProvider: formData.paymentProvider,
          // Отправляем ту сумму, которую насчитали (0 для триала, полная для покупки)
          amount: todayAmount,
        }),
      });

      if (!response.ok) {
        const err = (await response.json()) as SubscribeErrorResponse;
        throw new Error(err.error || "Error");
      }

      const responseData = (await response.json()) as SubscribeSuccessResponse;
      if (formData.paymentProvider === "yookassa") {
        if (responseData.confirmation_token) {
          setPaymentToken(responseData.confirmation_token);
          setCurrentSubscriptionId(responseData.subscription_id);
          setShowYookassaPaymentModal(true);
        } else router.push("/checkout/error");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || t("subscribe_error_message"));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex gap-1 flex-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* STEP 1: ZODIAC */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="font-serif text-2xl font-medium mb-2 text-center">
              {t("your_sign")}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              {t("choose_your_sign")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {zodiacSigns.map((sign) => (
                <button
                  key={sign.id}
                  onClick={() =>
                    setFormData({ ...formData, zodiacSign: sign.id })
                  }
                  className={cn(
                    "p-4 rounded-2xl glass text-center transition-all active:scale-95",
                    formData.zodiacSign === sign.id
                      ? "ring-2 ring-primary glow"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="text-3xl block mb-1">{sign.symbol}</span>
                  <span className="text-xs font-medium">{sign.name}</span>
                </button>
              ))}
            </div>
            <Button
              onClick={() => formData.zodiacSign && setStep(2)}
              disabled={!formData.zodiacSign}
              className="w-full mt-8 py-6 rounded-2xl text-base glow"
            >
              {t("next")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: EMAIL & DETAILS */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="font-serif text-2xl font-medium mb-2 text-center">
              {t("your_details")}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Укажите email для получения доступа
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="h-12 rounded-xl text-base glass"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Язык
                  </Label>
                  <CustomSelect
                    value={formData.locale}
                    onChange={(val) =>
                      setFormData({ ...formData, locale: val })
                    }
                    options={AVAILABLE_LANGUAGES}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {t("timezone")}
                  </Label>
                  <CustomSelect
                    value={formData.timezone}
                    onChange={(val) =>
                      setFormData({ ...formData, timezone: val })
                    }
                    options={[
                      ...TIMEZONES.map((tz) => ({ value: tz, label: tz })),
                      ...(!TIMEZONES.includes(formData.timezone)
                        ? [
                            {
                              value: formData.timezone,
                              label: formData.timezone,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 py-6 rounded-2xl glass border-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
              </Button>
              <Button
                onClick={handleSendOtp}
                disabled={!isValidEmail(formData.email) || isOtpLoading}
                className="flex-1 py-6 rounded-2xl glow"
              >
                {isOtpLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Отправить код <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: OTP VERIFICATION */}
        {/* STEP 3: OTP VERIFICATION */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                <LockKeyhole className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-medium mb-2">
                Код подтверждения
              </h1>
              <p className="text-sm text-muted-foreground">
                Мы отправили 6-значный код на <br />
                <span className="text-foreground font-medium">
                  {formData.email}
                </span>
              </p>
            </div>

            {/* OTP INPUT SLOTS */}
            <div className="relative w-full max-w-[320px] mx-auto mb-8">
              {/* 
                  Невидимый инпут, который перехватывает фокус и ввод.
                  Он растянут на всю ширину и высоту контейнера.
              */}
              <input
                autoComplete="one-time-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={formData.otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, otpCode: val });
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 font-mono"
                disabled={isOtpLoading}
                autoFocus
              />

              {/* Визуальные слоты */}
              <div className="flex justify-between gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isActive = formData.otpCode.length === index;
                  const isFilled = formData.otpCode.length > index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "w-12 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold transition-all duration-200 relative glass",
                        // Если слот активен (ожидает ввода)
                        isActive
                          ? "border-primary ring-2 ring-primary/20 scale-105 z-10 bg-background"
                          : "border-input/50",
                        // Если слот заполнен
                        isFilled &&
                          "bg-muted/30 border-primary/50 text-foreground",
                      )}
                    >
                      {/* Сама цифра */}
                      <span className="font-mono">
                        {formData.otpCode[index]}
                      </span>

                      {/* Мигающий курсор для активного слота */}
                      {isActive && !isOtpLoading && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-0.5 h-6 bg-primary animate-pulse rounded-full" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleVerifyOtp}
                disabled={formData.otpCode.length < 6 || isOtpLoading}
                className="w-full py-6 rounded-2xl glow text-base"
              >
                {isOtpLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Подтвердить"
                )}
              </Button>

              <div className="flex justify-between items-center px-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground text-xs font-normal"
                >
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Изменить почту
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOtp}
                  className="text-primary h-auto p-0 hover:bg-transparent hover:text-primary/80 text-xs font-normal"
                >
                  Отправить снова <RefreshCw className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PLANS & PAYMENT */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {userStatus?.hasActiveSubscription ? (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <Check className="w-8 h-8" />
                </div>
                <h1 className="font-serif text-2xl font-medium">
                  {t("subscription_is_already_active_head")}
                </h1>
                <p className="text-muted-foreground">
                  У вас уже есть активная подписка на аккаунте {formData.email}.
                </p>
                <Button asChild className="w-full py-6 rounded-2xl glow">
                  <Link href="/dashboard">Перейти в личный кабинет</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="font-serif text-2xl font-medium mb-2 text-center">
                  {t("choose_pricing")}
                </h1>

                {/* Сообщение о статусе (Триал или Покупка) */}
                <div
                  className={cn(
                    "text-sm text-center mb-6 py-2 px-3 rounded-xl border",
                    isEligibleForTrial
                      ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
                  )}
                >
                  {isEligibleForTrial
                    ? t("seven_days_free")
                    : "Вы уже использовали пробный период. Для продолжения выберите тариф."}
                </div>

                {/* Payment Provider Selector */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-[240px] relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <CustomSelect
                      value={formData.paymentProvider}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          paymentProvider: val as PaymentProviderId,
                        })
                      }
                      options={PAYMENT_METHODS}
                      className="[&>button]:pl-9"
                      align="center"
                    />
                  </div>
                </div>

                {/* Plans List */}
                {isPlansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => {
                      const translation = i18nPlans.find(
                        (p) => p.id === plan.name,
                      );
                      if (!translation) return null;
                      const ui =
                        UI_CONFIG[plan.name] || UI_CONFIG[PlanName.basic];
                      const priceObj = plan.prices.find(
                        (p) => p.currency === formData.currency,
                      );
                      const priceDisplay = priceObj
                        ? formatPrice(priceObj.amount, priceObj.currency)
                        : "—";

                      return (
                        <button
                          key={plan.id}
                          onClick={() =>
                            setFormData({ ...formData, plan: plan.id })
                          }
                          className={cn(
                            "w-full p-4 rounded-2xl glass text-left transition-all active:scale-[0.99]",
                            formData.plan === plan.id
                              ? "ring-2 ring-primary glow"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center",
                                  ui.highlighted
                                    ? "bg-gradient-to-br from-primary to-accent"
                                    : "bg-muted",
                                )}
                              >
                                <ui.icon
                                  className={cn(
                                    "w-5 h-5",
                                    ui.highlighted
                                      ? "text-white"
                                      : "text-muted-foreground",
                                  )}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {translation.name}
                                  </span>
                                  {ui.highlighted && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                      {t("popular")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold">
                                {priceDisplay}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {" "}
                                / {t("monthly")}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {translation.features.map((f) => (
                              <span
                                key={f}
                                className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-primary" /> {f}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Summary Box */}
                <div className="mt-6 p-4 rounded-2xl glass">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">
                      {t("plan")} {selectedPlanName}
                    </span>
                    <span>
                      {selectedPriceDisplay} / {t("monthly")}
                    </span>
                  </div>

                  {isEligibleForTrial ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("seven_days_free_short")}
                      </span>
                      <span className="text-green-500 font-medium">
                        - {selectedPriceDisplay}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Скидка</span>
                      <span className="text-muted-foreground">0</span>
                    </div>
                  )}

                  <div className="border-t border-border/50 mt-3 pt-3 flex justify-between font-medium">
                    <span>{t("today")}</span>
                    <span
                      className={cn(
                        "text-lg",
                        todayAmount === 0 ? "text-green-500" : "",
                      )}
                    >
                      {todayAmount === 0
                        ? new Intl.NumberFormat(formData.locale, {
                            style: "currency",
                            currency: selectedCurrencyCode,
                          }).format(0)
                        : selectedPriceDisplay}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3 text-[11px] leading-snug text-blue-200/80">
                  <Info className="w-4 h-4 shrink-0 text-blue-400" />
                  <p>{t("cash_retention_message")}</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)} // Return to step 2 to allow email change (logic allows going back to 3/2)
                    className="flex-1 py-6 rounded-2xl glass border-0"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !selectedDbPlan}
                    className="flex-1 py-6 rounded-2xl glow"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        {t("loading")}
                      </>
                    ) : (
                      <>
                        {isEligibleForTrial ? t("start_free") : "Оплатить"}{" "}
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {t("agree_to_terms")}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <YookassaPaymentModal
        isOpen={showYookassaPaymentModal}
        onClose={() => setShowYookassaPaymentModal(false)}
        confirmationToken={paymentToken}
        subscriptionId={currentSubscriptionId}
      />
    </main>
  );
}
