"use client";

import { ForecastSource, IDailyForecast } from "@/lib/types/database";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  Crown,
  Sparkles,
  Zap,
  Heart,
  Banknote,
  Smile,
  Info,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ===================== CONSTS ===================== */

const ZODIAC_SYMBOLS: Record<string, string> = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓",
};

const ZODIAC_NAMES_RU: Record<string, string> = {
  aries: "Овен",
  taurus: "Телец",
  gemini: "Близнецы",
  cancer: "Рак",
  leo: "Лев",
  virgo: "Дева",
  libra: "Весы",
  scorpio: "Скорпион",
  sagittarius: "Стрелец",
  capricorn: "Козерог",
  aquarius: "Водолей",
  pisces: "Рыбы",
};

const PLANET_ICONS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
};

/* ===================== COMPONENTS ===================== */

// Красивый чип для основных показателей (Любовь/Деньги/Настроение)
const MetricCard = ({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: any;
  label: string;
  value: string;
  colorClass: string;
}) => (
  <div className="flex flex-col bg-zinc-900/50 border border-white/5 rounded-lg p-2.5 flex-1 min-w-[80px] hover:bg-zinc-800/50 transition-colors">
    <div
      className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-1 ${colorClass}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </div>
    <div className="text-xs font-medium text-zinc-200 leading-tight">
      {value}
    </div>
  </div>
);

// Компонент для отображения технических данных (астрономия)
function TechnicalSource({ source }: { source: ForecastSource | null }) {
  if (!source) return null;
  const srcObj = typeof source === "object" ? source : {};
  // @ts-ignore
  const planets = srcObj.planets || [];
  const isAi = !planets.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
          <Info className="w-3 h-3" />
          <span>{isAi ? "AI Model" : "Ephemeris Data"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-64 p-3 bg-black/95 border-zinc-800 text-xs backdrop-blur-xl"
      >
        {isAi ? (
          <div className="text-zinc-400">
            Сгенерировано AI без точных эфемерид.
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1 mb-2">
              Позиции планет
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {planets.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-zinc-500"
                >
                  <span className="flex items-center gap-1 text-zinc-300">
                    <span className="text-indigo-400 w-3">
                      {PLANET_ICONS[p.name] ?? "•"}
                    </span>
                    {p.name.slice(0, 3)}
                  </span>
                  <span>
                    {p.sign.slice(0, 3)} {p.degree.toFixed(0)}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ===================== MAIN COMPONENT ===================== */

export default function DatePickerForecasts({
  initialDate,
}: {
  initialDate: string;
}) {
  const [date, setDate] = useState<Date>(() => {
    const [y, m, d] = initialDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  const [forecasts, setForecasts] = useState<IDailyForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - 30);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const dateStr = format(date, "yyyy-MM-dd");
      try {
        const res = await fetch(`/api/forecasts?date=${dateStr}`, {
          credentials: "same-origin",
        });
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Ошибка");
        if (mounted) setForecasts((data.forecasts as IDailyForecast[]) ?? []);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [date]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
            Астрологический прогноз
          </h2>
          <p className="text-zinc-400 mt-1">
            Ежедневная карта звездного неба для всех знаков
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:text-white transition-all w-full md:w-auto min-w-[200px] justify-between"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-400" />
                {format(date, "d MMMM yyyy", { locale: ru })}
              </span>
              <ChevronRight className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-auto p-0 bg-zinc-950 border-zinc-800"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) =>
                d > new Date(today.getTime() + 86400000 * 2) || d < minDate
              }
              initialFocus
              locale={ru}
              className="rounded-md border-zinc-800"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[400px] rounded-2xl bg-zinc-900/30 animate-pulse border border-zinc-800/50"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="p-6 text-red-300 border border-red-900/50 bg-red-950/10 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {error}
        </div>
      )}

      {!loading && !error && forecasts.length === 0 && (
        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          <p className="text-zinc-500">
            Звезды молчат. Данные на эту дату отсутствуют.
          </p>
        </div>
      )}

      {/* Forecast Grid */}
      {!loading && !error && forecasts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {forecasts.map((f) => (
            <ForecastCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== CARD COMPONENT ===================== */

function ForecastCard({ f }: { f: IDailyForecast }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/80 overflow-hidden hover:border-zinc-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/20">
      {/* Subtle Gradient Glow on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* --- HEADER --- */}
      <div className="relative px-6 pt-6 pb-4 flex items-center justify-between z-10">
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
            {format(f.forecast_date, "EEEE", { locale: ru })}
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {ZODIAC_NAMES_RU[f.zodiac_sign]}
            <span className="text-zinc-600 font-normal text-lg">
              {ZODIAC_SYMBOLS[f.zodiac_sign]}
            </span>
          </h3>
        </div>

        {/* Zodiac Icon Container */}
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 group-hover:border-indigo-500/30 transition-all duration-500 text-indigo-200">
          {ZODIAC_SYMBOLS[f.zodiac_sign]}
        </div>
      </div>

      <div className="px-6 space-y-5 flex-1 z-10">
        {/* --- METRICS GRID (Dashboard style) --- */}
        <div className="flex flex-col gap-2">
          <MetricCard
            icon={Heart}
            label="Любовь"
            value={f.love}
            colorClass="text-rose-400"
          />
          <MetricCard
            icon={Banknote}
            label="Деньги"
            value={f.money}
            colorClass="text-emerald-400"
          />
          <MetricCard
            icon={Smile}
            label="Настрой"
            value={f.mood}
            colorClass="text-sky-400"
          />
        </div>

        {/* --- ADVICE (Hero Text) --- */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-700 rounded-full" />
          <p className="pl-3.5 text-sm text-zinc-300 leading-relaxed italic">
            "{f.advice}"
          </p>
        </div>

        {/* --- PLUS TIER (Mystical) --- */}
        {(f.affirmation || f.compatibility) && (
          <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/10 p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1.5 opacity-20">
              <Sparkles className="w-12 h-12 text-indigo-500" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border-0 text-[10px] uppercase tracking-wider h-5 px-1.5"
              >
                Plus Insight
              </Badge>
            </div>

            {f.affirmation && (
              <div className="text-sm text-indigo-100 font-medium">
                <span className="text-indigo-400 block text-[10px] uppercase tracking-widest mb-0.5">
                  Аффирмация
                </span>
                {f.affirmation}
              </div>
            )}

            {f.compatibility && (
              <div className="flex items-center gap-3 pt-2 border-t border-indigo-500/10 mt-2">
                <div className="bg-indigo-950 rounded-full w-8 h-8 flex items-center justify-center text-lg border border-indigo-500/20 text-indigo-200 shrink-0">
                  {ZODIAC_SYMBOLS[f.compatibility.sign]}
                </div>
                <div>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-widest">
                    Совместимость
                  </div>
                  <div className="text-xs text-indigo-200 leading-tight">
                    <span className="font-semibold text-white">
                      {ZODIAC_NAMES_RU[f.compatibility.sign]}
                    </span>
                    : {f.compatibility.text}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- PREMIUM TIER (Gold/Luxury) --- */}
        {(f.lucky_metrics || f.tomorrow_insight) && (
          <div className="rounded-xl bg-gradient-to-b from-amber-950/20 to-transparent border border-amber-500/10 p-4 space-y-3 relative">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border-0 text-[10px] uppercase tracking-wider h-5 px-1.5 gap-1"
              >
                <Crown className="w-3 h-3" /> Premium
              </Badge>
            </div>

            {f.lucky_metrics && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <LuckyItem label="Число" value={f.lucky_metrics.number.toString()} />
                <LuckyItem label="Время" value={f.lucky_metrics.time} />
                <LuckyItem label="Цвет" value={f.lucky_metrics.color} />
              </div>
            )}

            {f.tomorrow_insight && (
              <div className="flex gap-2 items-start mt-2 bg-amber-900/10 p-2 rounded border border-amber-500/5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100/80 leading-relaxed">
                  <span className="font-semibold text-amber-200 block mb-0.5">
                    Инсайт на завтра
                  </span>
                  {f.tomorrow_insight}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-auto px-6 py-3 border-t border-white/5 bg-zinc-900/30 flex justify-between items-center text-[10px]">
        <TechnicalSource source={f.source} />
        <span className="text-zinc-600 font-mono">
          UPD:{" "}
          {f.generated_at ? format(new Date(f.generated_at), "HH:mm") : "—"}
        </span>
      </div>
    </div>
  );
}

// Мини-компонент для "Удачных метрик"
function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-1.5 rounded bg-zinc-900 border border-zinc-800">
      <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className="text-xs font-mono font-medium text-amber-200 truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
