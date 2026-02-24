"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { ZODIAC_SIGNS } from "@/lib/types/enums";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/navigation";
import { isValidTelegramUsername } from "@/lib/utils/is-valid-tg-username";
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

const LOCALE_TO_CURRENCY: Record<string, Currency> = {
  by: Currency.BYN,
  ru: Currency.RUB,
  en: Currency.USD,
  kz: Currency.KZT,
  zh: Currency.CNY,
};

const DEFAULT_CURRENCY = Currency.USD;
const SORT_ORDER = [PlanName.basic, PlanName.plus, PlanName.premium];

const UI_CONFIG: Record<string, { icon: any; highlighted: boolean }> = {
  [PlanName.basic]: { icon: Star, highlighted: false },
  [PlanName.plus]: { icon: Sparkles, highlighted: true },
  [PlanName.premium]: { icon: Crown, highlighted: false },
};

// Данные для селектов
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

// --- Payment Methods Configuration ---

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
  {
    value: "stripe",
    label: "Stripe (USD)",
    currency: Currency.USD,
    disabled: true,
  },
  {
    value: "paypal",
    label: "PayPal (USD)",
    currency: Currency.USD,
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

      {/* Backdrop для закрытия по клику вне */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Меню */}
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

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [plans, setPlans] = useState<PlanWithPrices[]>([]);

  // Modals state
  const [showYookassaPaymentModal, setShowYookassaPaymentModal] =
    useState(false);

  // Payment data state
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<
    string | null
  >(null);

  // Основной стейт формы
  const [formData, setFormData] = useState({
    zodiacSign: "",
    telegramUsername: "",
    plan: "",
    amount: 0,
    locale: currentLocale,
    timezone: "Europe/Minsk",
    currency: Currency.RUB as Currency,
    paymentProvider: "yookassa" as PaymentProviderId,
  });

  // Effects
  useEffect(() => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTimezone) {
        setFormData((prev) => ({ ...prev, timezone: userTimezone }));
      }
    } catch (e) {
      console.error("Failed to detect timezone", e);
    }
  }, []);

  // При смене платежного метода обновляем валюту
  useEffect(() => {
    const method = PAYMENT_METHODS.find(
      (m) => m.value === formData.paymentProvider,
    );
    if (method) {
      setFormData((prev) => ({ ...prev, currency: method.currency }));
    }
  }, [formData.paymentProvider]);

  // Загрузка планов
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
        if (!searchParams.get("plan") && plusPlan) {
          setFormData((prev) => ({ ...prev, plan: plusPlan.id }));
        }
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
      if (found) {
        setFormData((prev) => ({ ...prev, plan: found.id }));
      }
    }
  }, [searchParams, plans]);

  // Calculations
  const formatPrice = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat(formData.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const selectedDbPlan = plans.find((p) => p.id === formData.plan);
  const i18nPlans = t.raw("plans") as I18nPlan[];
  const selectedPlanName = selectedDbPlan
    ? i18nPlans.find((p) => p.id === selectedDbPlan.name)?.name ||
      selectedDbPlan.name
    : "—";

  let selectedPriceDisplay = "—";
  let selectedCurrencyCode = formData.currency;

  if (selectedDbPlan) {
    // Ищем цену строго в валюте выбранного платежного метода
    const priceObj = selectedDbPlan.prices.find(
      (p) => p.currency === formData.currency,
    );
    if (priceObj) {
      selectedCurrencyCode = priceObj.currency;
      selectedPriceDisplay = formatPrice(priceObj.amount, priceObj.currency);
    } else {
      // Fallback если вдруг цены нет (хотя бэкенд должен гарантировать)
      const fallback = selectedDbPlan.prices[0];
      if (fallback)
        selectedPriceDisplay = formatPrice(fallback.amount, fallback.currency);
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const selectedPlanObj = plans.find((p) => p.id === formData.plan);

      if (!selectedPlanObj) {
        throw new Error(t("select_plan_error"));
      }

      // Находим цену для текущей валюты (которая зависит от провайдера)
      let priceObj = selectedPlanObj.prices.find(
        (p) => p.currency === formData.currency,
      );

      if (!priceObj) {
        throw new Error(`Price not found for currency ${formData.currency}`);
      }

      const amountToSend = priceObj.amount;
      console.log(formData);

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_username: formData.telegramUsername,
          zodiac_sign: formData.zodiacSign,
          plan_id: formData.plan,
          locale: formData.locale,
          timezone: formData.timezone,
          currency: formData.currency,
          paymentProvider: formData.paymentProvider, // Можно отправить провайдера на бэк, если нужно
          amount: 0,
        }),
      });

      if (!response.ok) {
        const err = (await response.json()) as SubscribeErrorResponse;
        throw new Error(err.error || "Error");
      }

      const responseData = (await response.json()) as SubscribeSuccessResponse;

      // Логика открытия виджета
      // Предполагаем, что бэкенд возвращает confirmation_token и subscription_id
      if (formData.paymentProvider === "yookassa") {
        if (responseData.confirmation_token) {
          setPaymentToken(responseData.confirmation_token);
          setCurrentSubscriptionId(responseData.subscription_id);
          setShowYookassaPaymentModal(true);
        } else {
          // Если токена нет, возможно это редирект сценарий или ошибка
          router.push("/checkout/error");
        }
      } else {
        // Для других провайдеров пока заглушка или редирект
        // Т.к. они disabled, сюда попасть сложно, но на всякий случай:
        alert("Payment provider integration coming soon");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || t("subscribe_error_message"));
    } finally {
      setIsLoading(false);
    }
  };

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
            {[1, 2, 3].map((s) => (
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
        {/* STEP 1 */}
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

        {/* STEP 2 */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="font-serif text-2xl font-medium mb-2 text-center">
              {t("your_details")}
            </h1>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("username")}</Label>
                <Input
                  placeholder="@username"
                  value={formData.telegramUsername}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telegramUsername: e.target.value,
                    })
                  }
                  className="h-12 rounded-xl text-base glass"
                />
                {formData.telegramUsername &&
                  !isValidTelegramUsername(formData.telegramUsername) && (
                    <p className="text-xs text-red-500">
                      {t("invalid_username")}
                    </p>
                  )}
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
                    <Clock className="w-3.5 h-3.5" /> Часовой пояс
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
                onClick={() =>
                  isValidTelegramUsername(formData.telegramUsername) &&
                  setStep(3)
                }
                disabled={!isValidTelegramUsername(formData.telegramUsername)}
                className="flex-1 py-6 rounded-2xl glow"
              >
                {t("next")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="font-serif text-2xl font-medium mb-2 text-center">
              {t("choose_pricing")}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t("seven_days_free")}
            </p>

            {/* Payment Method Select (Former Currency Select) */}
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

            {isPlansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => {
                  const translation = i18nPlans.find((p) => p.id === plan.name);
                  if (!translation) return null;
                  const ui = UI_CONFIG[plan.name] || UI_CONFIG[PlanName.basic];

                  // Отображаем цену в валюте выбранного провайдера
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

            <div className="mt-6 p-4 rounded-2xl glass">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">
                  {t("plan")} {selectedPlanName}
                </span>
                <span>
                  {selectedPriceDisplay} / {t("monthly")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("seven_days_free_short")}
                </span>
                <span className="text-green-400">- {selectedPriceDisplay}</span>
              </div>
              <div className="border-t border-border/50 mt-3 pt-3 flex justify-between font-medium">
                <span>{t("today")}</span>
                <span className="text-green-400">
                  {new Intl.NumberFormat(formData.locale, {
                    style: "currency",
                    currency: selectedCurrencyCode,
                  }).format(0)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
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
                    {t("start_free")} <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("agree_to_terms")}
            </p>
          </div>
        )}
      </div>

      {/* --- PAYMENT MODALS --- */}
      <YookassaPaymentModal
        isOpen={showYookassaPaymentModal}
        onClose={() => setShowYookassaPaymentModal(false)}
        confirmationToken={paymentToken}
        subscriptionId={currentSubscriptionId}
      />
    </main>
  );
}
