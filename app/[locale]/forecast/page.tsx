import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { verifySession } from "@/lib/auth/jwt";
import { ForecastData, getUserForecast } from "@/lib/services/forecast";
import { PlanName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import {
  Heart,
  Wallet,
  Smile,
  Lightbulb,
  Lock,
  Sparkles,
  Crown,
  ArrowRight,
  Star,
  Users,
  Clock,
  Palette,
  Hash,
  Zap,
} from "lucide-react";

function LockedBlock({
  title,
  icon: Icon,
  requiredPlan,
  description,
  className = "",
}: {
  title: string;
  icon: any;
  requiredPlan: "Plus" | "Premium";
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl glass border border-white/5 p-6 flex flex-col justify-between group ${className}`}
    >
      {/* Размытый фон */}
      <div className="absolute inset-0 bg-muted/10 blur-xl group-hover:bg-muted/20 transition-all" />

      <div className="relative z-10 flex items-start justify-between opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-medium">{title}</span>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex-grow flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2 shadow-inner">
          <Lock className="w-5 h-5 text-white/70" />
        </div>
        <p className="text-xs font-medium text-muted-foreground mb-3 px-4">
          {description}
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs rounded-full px-4"
          asChild
        >
          <Link href="/subscribe">Открыть {requiredPlan}</Link>
        </Button>
      </div>
    </div>
  );
}

// Блок удачи (Premium)
function LuckyMetricItem({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: any;
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${colorClass}`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
        {label}
      </span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

export default async function ForecastPage() {
  const locale = await getLocale();
  const t = await getTranslations("ForecastPage");

  // 1. Проверка сессии
  const token = (await cookies()).get("session_token")?.value;
  if (!token) redirect("/login?callbackUrl=/forecast");

  const session = await verifySession(token);
  if (!session) redirect("/login?callbackUrl=/forecast");

  // 2. Загрузка данных
  // Приводим тип data к ForecastData
  const {
    status,
    data: rawData,
    userPlan,
    userSign,
  } = await getUserForecast(session.userId, locale);

  // Явное приведение типа для безопасности в компоненте, если сервис возвращает Partial
  const data = rawData as ForecastData | null;

  if (status === "no_zodiac") redirect("/subscribe");
  if (status === "no_forecast" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-serif mb-2">Звезды еще спят ✨</h1>
        <p className="text-muted-foreground mb-6">Прогноз формируется...</p>
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    );
  }

  // Определяем уровни доступа
  const isPlus = userPlan === PlanName.plus;
  const isPremium = userPlan === PlanName.premium;
  const showPlusContent = isPlus || isPremium;
  const showPremiumContent = isPremium;

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* --- HEADER --- */}
      <header className="pt-8 pb-6 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Гороскоп на сегодня</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-2 capitalize">
          {userSign}
        </h1>
        <p className="text-muted-foreground">
          {new Date(data.date).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            weekday: "long",
          })}
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* --- BASIC GRID (Always Visible) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-rose-500/10 to-transparent border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">Любовь</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">{data.love}</p>
          </Card>

          <Card className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">Финансы</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {data.money}
            </p>
          </Card>

          <Card className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 to-transparent border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Smile className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">Настроение</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">{data.mood}</p>
          </Card>

          <Card className="p-6 rounded-3xl bg-primary/5 border-primary/10 border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">Совет дня</h3>
            </div>
            <p className="text-foreground/90 font-medium leading-relaxed italic">
              "{data.advice}"
            </p>
          </Card>
        </div>

        {/* --- PLUS CONTENT (Affirmation & Compatibility) --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Аффирмация (Занимает 3/5 ширины на десктопе) */}
          <div className="md:col-span-3 h-full">
            {showPlusContent ? (
              <Card className="p-6 rounded-3xl glass border-white/5 relative overflow-hidden h-full flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">
                      Аффирмация дня
                    </span>
                  </div>
                  <p className="text-xl md:text-2xl font-serif leading-snug text-purple-50">
                    «{data.affirmation}»
                  </p>
                </div>
              </Card>
            ) : (
              <LockedBlock
                className="h-full min-h-[200px]"
                title="Аффирмация"
                icon={Sparkles}
                requiredPlan="Plus"
                description="Позитивная установка для программирования дня"
              />
            )}
          </div>

          {/* Совместимость (Занимает 2/5 ширины на десктопе) */}
          <div className="md:col-span-2 h-full">
            {showPlusContent ? (
              <Card className="p-6 rounded-3xl glass border-white/5 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-pink-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wider uppercase">
                    Совместимость
                  </span>
                </div>

                <div className="flex-grow flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full text-sm font-semibold border border-pink-500/20">
                      {data.compatibility.sign}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Идеальная пара
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {data.compatibility.text}
                  </p>
                </div>
              </Card>
            ) : (
              <LockedBlock
                className="h-full min-h-[200px]"
                title="Совместимость"
                icon={Users}
                requiredPlan="Plus"
                description="С кем сегодня сложатся идеальные отношения?"
              />
            )}
          </div>
        </div>

        {/* --- PREMIUM CONTENT (Lucky Metrics & Tomorrow) --- */}
        <div className="space-y-4">
          {/* Lucky Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {showPremiumContent ? (
              <>
                <div className="md:col-span-3 p-1">
                  <div className="flex items-center gap-2 mb-3 text-amber-400 px-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">
                      Ваши знаки удачи
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <LuckyMetricItem
                      icon={Clock}
                      label="Время"
                      value={data.luckyMetrics.time}
                      colorClass="bg-blue-500"
                    />
                    <LuckyMetricItem
                      icon={Palette}
                      label="Цвет"
                      value={data.luckyMetrics.color}
                      colorClass="bg-purple-500"
                    />
                    <LuckyMetricItem
                      icon={Hash}
                      label="Число"
                      value={data.luckyMetrics.number}
                      colorClass="bg-emerald-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="md:col-span-3">
                <LockedBlock
                  title="Формула удачи"
                  icon={Zap}
                  requiredPlan="Premium"
                  description="Счастливое число, цвет и лучшее время для действий"
                />
              </div>
            )}
          </div>

          {/* Tomorrow Insight */}
          <div>
            {showPremiumContent ? (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-slate-900/60 border border-indigo-500/20 relative overflow-hidden">
                {/* Декоративный фон */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-indigo-300">
                    <Crown className="w-5 h-5" />
                    <h3 className="font-semibold text-lg">Прогноз на завтра</h3>
                  </div>
                  <p className="leading-relaxed text-indigo-100/90 text-lg">
                    {data.tomorrowInsight}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs text-indigo-400/60 uppercase font-medium tracking-widest">
                      Premium Access
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[180px]">
                <LockedBlock
                  title="Взгляд в завтра"
                  icon={Crown}
                  requiredPlan="Premium"
                  description="Узнайте заранее, к чему готовиться завтра"
                />
              </div>
            )}
          </div>
        </div>

        {/* --- UPSELL FOOTER (If not Premium) --- */}
        {!isPremium && (
          <div className="mt-8 p-8 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-5"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">
                Раскройте свой полный потенциал
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Цвета удачи, счастливые числа и точный прогноз на завтра
                доступны только в Premium подписке.
              </p>
              <Button
                className="glow rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20"
                size="lg"
                asChild
              >
                <Link href="/subscribe">
                  Улучшить тариф <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
