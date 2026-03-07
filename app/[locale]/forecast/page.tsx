import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { verifySession } from "@/lib/auth/jwt";
import { getUserForecast } from "@/lib/services/forecast";
import { PlanName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { 
  Heart, Wallet, Smile, Lightbulb, 
  Lock, Sparkles, Crown, ArrowRight, Star
} from "lucide-react";

// Иконки для блоков
const ICONS = {
  love: Heart,
  money: Wallet,
  mood: Smile,
  advice: Lightbulb,
};

// Компонент "Замка" для платного контента
function LockedBlock({ 
  title, 
  icon: Icon, 
  requiredPlan,
  description 
}: { 
  title: string; 
  icon: any; 
  requiredPlan: "Plus" | "Premium";
  description: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl glass border border-white/5 p-6 h-full min-h-[160px] flex flex-col justify-between group">
      {/* Размытый фон (имитация контента) */}
      <div className="absolute inset-0 bg-muted/10 blur-xl group-hover:bg-muted/20 transition-all" />
      
      <div className="relative z-10 flex items-start justify-between opacity-50">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium">{title}</span>
         </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
           <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2 shadow-inner">
             <Lock className="w-5 h-5 text-white/70" />
           </div>
           <p className="text-xs font-medium text-muted-foreground mb-3 px-4">
             {description}
           </p>
           <Button size="sm" variant="default" className="h-8 text-xs rounded-full px-4" asChild>
             <Link href="/subscribe">Открыть {requiredPlan}</Link>
           </Button>
        </div>
      </div>
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
  const { status, data, userPlan, userSign } = await getUserForecast(session.userId, locale);

  // Обработка пограничных состояний
  if (status === "no_zodiac") redirect("/subscribe"); // Или на страницу выбора знака
  if (status === "no_forecast") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-serif mb-2">Звезды еще спят ✨</h1>
        <p className="text-muted-foreground mb-6">Прогноз для вашего знака на сегодня еще формируется.</p>
        <Button asChild><Link href="/">На главную</Link></Button>
      </div>
    );
  }

  // Определяем уровни доступа
  const isBasic = userPlan === PlanName.basic;
  const isPlus = userPlan === PlanName.plus;
  const isPremium = userPlan === PlanName.premium;

  const showPlusContent = isPlus || isPremium;
  const showPremiumContent = isPremium;

  return (
    <main className="min-h-screen bg-background pb-20">
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
          {new Date(data.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' })}
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-4 md:space-y-6">
        
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
            <p className="text-muted-foreground leading-relaxed">{data.money}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showPlusContent ? (
            <Card className="p-6 rounded-3xl glass border-white/5 col-span-1 md:col-span-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Sparkles className="w-24 h-24" />
               </div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">Аффирмация</span>
                 </div>
                 <p className="text-xl md:text-2xl font-serif text-center py-4 text-purple-100">
                   «{data.affirmation}»
                 </p>
               </div>
            </Card>
          ) : (
            <div className="col-span-1 md:col-span-2 h-[180px]">
              <LockedBlock 
                title="Аффирмация дня" 
                icon={Sparkles} 
                requiredPlan="Plus" 
                description="Мощная установка для вашего подсознания"
              />
            </div>
          )}

          {showPlusContent && data.compatibility ? (
             // Здесь можно сделать красивый компонент для совместимости
             <Card className="p-6 rounded-3xl glass border-white/5">
                <h3 className="font-semibold mb-4">Совместимость сегодня</h3>
                <div className="space-y-3">
                   {/* Пример рендера JSON данных */}
                   <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">В любви</span>
                      <span className="font-medium">{data.compatibility.love || "—"}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">В делах</span>
                      <span className="font-medium">{data.compatibility.work || "—"}</span>
                   </div>
                </div>
             </Card>
          ) : !showPlusContent ? (
            // Блок совместимости (закрыт) - можно добавить во вторую колонку, 
            // если Аффирмация не занимает всю ширину, или скрыть.
            null
          ) : null}
        </div>

        {/* --- PREMIUM CONTENT (Lucky Metrics & Tomorrow) --- */}
        <div className="grid grid-cols-1 gap-4">
           {showPremiumContent ? (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/50 to-blue-900/50 border border-indigo-500/20">
                 <div className="flex items-center gap-2 mb-4 text-indigo-300">
                    <Crown className="w-5 h-5" />
                    <h3 className="font-semibold">Инсайт на завтра</h3>
                 </div>
                 <p className="leading-relaxed text-indigo-50">
                    {data.tomorrowInsight}
                 </p>
              </div>
           ) : (
             <div className="h-[200px]">
                <LockedBlock 
                  title="Взгляд в завтра" 
                  icon={Crown} 
                  requiredPlan="Premium" 
                  description="Узнайте заранее, к чему готовиться завтра"
                />
             </div>
           )}
        </div>

        {/* --- UPSELL FOOTER (If not Premium) --- */}
        {!isPremium && (
          <div className="mt-8 p-6 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 text-center">
             <h3 className="text-lg font-semibold mb-2">Хотите знать больше?</h3>
             <p className="text-muted-foreground text-sm mb-4">
               Откройте доступ ко всем аспектам прогноза с подпиской Premium.
             </p>
             <Button className="glow rounded-full px-8" size="lg" asChild>
               <Link href="/subscribe">
                 Улучшить тариф <ArrowRight className="w-4 h-4 ml-2" />
               </Link>
             </Button>
          </div>
        )}
      </div>
    </main>
  );
}