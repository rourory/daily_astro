"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Crown, Sparkles, Star, Zap, AlertCircle } from "lucide-react";
import { Plan, PlanPrice, Currency, PlanName } from "@prisma/client";
import axios from "axios";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TYPES ---

// Расширяем тип плана из Prisma, добавляя цены
type PlanWithPrices = Plan & {
  prices: PlanPrice[];
};

// Тип для структуры из вашего JSON (messages.json)
interface I18nPlan {
  id: string;
  name: string;
  features: string[];
  badge?: string;
}

// --- CONFIG ---

// 1. UI конфигурация (иконки и подсветка)
const PLAN_UI_CONFIG: Record<string, { icon: any; highlighted: boolean }> = {
  basic: { icon: Sparkles, highlighted: false },
  plus: { icon: Zap, highlighted: true }, // "Плюс" обычно выделяют
  premium: { icon: Crown, highlighted: false },
};

// 2. Порядок сортировки (чтобы Basic всегда был слева/первым)
const SORT_ORDER = ["basic", "plus", "premium"];

// 3. Маппинг Локаль -> Валюта
const LOCALE_TO_CURRENCY: Record<string, Currency> = {
  by: "BYN",
  ru: "RUB",
  en: "USD",
  zh: "CNY",
  kk: "KZT",
};

const DEFAULT_CURRENCY: Currency = "USD";

export function PricingSection() {
  const t = useTranslations("PricingSection");
  const locale = useLocale();

  const [plans, setPlans] = useState<PlanWithPrices[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Получаем переводы планов как массив объектов
  const i18nPlans = t.raw("plans") as I18nPlan[];

  // Определяем целевую валюту для текущего пользователя
  const targetCurrency = LOCALE_TO_CURRENCY[locale] || DEFAULT_CURRENCY;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get<{ plans: PlanWithPrices[] }>(
          "/api/plans",
        );

        // Сортируем планы
        const sorted = data.plans.sort(
          (a, b) => SORT_ORDER.indexOf(a.name) - SORT_ORDER.indexOf(b.name),
        );
        setPlans(sorted);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Форматирование цены
  const formatPrice = (amountInCents: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      currencyDisplay: "narrowSymbol", // $, ₽ (вместо USD, RUB)
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountInCents / 100);
  };

  if (isError) {
    return (
      <div className="py-20 text-center text-red-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-2" />
        <p>{t("simple_pricing")}</p> {/* Fallback text */}
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </div>
    );
  }

  return (
    <section id="pricing" className="relative py-20 px-6">
      <div className="max-w-lg mx-auto">
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm">{t("days_free")}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium mb-2">
            {t("simple_pricing")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("cancel_anytime")}</p>
        </div>

        {/* CARDS */}
        <div className="space-y-4">
          {isLoading ? (
            <PlansSkeleton />
          ) : (
            plans.map((plan) => {
              // 1. Находим перевод для этого плана по ID (basic === basic)
              const translation = i18nPlans.find((p) => p.id === plan.name);

              // Если перевода нет в JSON, пропускаем или рендерим фоллбэк
              if (!translation) return null;

              const ui = PLAN_UI_CONFIG[plan.name] || PLAN_UI_CONFIG.basic;

              // 2. Ищем цену: Сначала целевую (RUB/BYN...), если нет — USD, если нет — первую попавшуюся
              let priceObj = plan.prices.find(
                (p) => p.currency === targetCurrency,
              );
              if (!priceObj) {
                priceObj = plan.prices.find(
                  (p) => p.currency === DEFAULT_CURRENCY,
                );
              }
              if (!priceObj && plan.prices.length > 0) {
                priceObj = plan.prices[0];
              }

              const priceDisplay = priceObj
                ? formatPrice(priceObj.amount, priceObj.currency)
                : "—";

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative glass rounded-2xl p-5 transition-all duration-300 active:scale-[0.99]",
                    ui.highlighted &&
                      "ring-2 ring-primary glow shadow-lg shadow-primary/10",
                  )}
                >
                  {/* Бейдж ("Популярный") берем из JSON */}
                  {translation.badge && (
                    <div className="absolute -top-2.5 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-sm">
                      {translation.badge}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
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
                        {/* Название из JSON */}
                        <h3 className="font-medium">{translation.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {translation.features.length} {t("features")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{priceDisplay}</span>
                      <span className="text-sm text-muted-foreground ml-1">
                        / {t("month")}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex flex-wrap gap-2">
                      {translation.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors"
                        >
                          <Check className="w-3 h-3 text-primary" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full mt-4 rounded-xl py-6 text-base shadow-sm",
                      ui.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted hover:bg-muted/80 text-foreground",
                    )}
                    asChild
                  >
                    <Link href={`/subscribe?planId=${plan.id}`}>
                      {t("start_for_free")}
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-6 opacity-70">
          {t("safe_payment")}
        </p>
      </div>
    </section>
  );
}

// Вынесенный компонент скелетона
function PlansSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass rounded-2xl p-5 border border-white/5 bg-muted/5"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-3" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="w-20 h-7 ml-auto" />
              <Skeleton className="w-10 h-3 ml-auto" />
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-white/5 flex gap-2">
            <Skeleton className="w-24 h-6 rounded-full" />
            <Skeleton className="w-32 h-6 rounded-full" />
          </div>
          <Skeleton className="w-full h-14 mt-6 rounded-xl" />
        </div>
      ))}
    </>
  );
}
