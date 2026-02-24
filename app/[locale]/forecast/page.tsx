import prisma from "@/lib/prisma";
import {
  Heart,
  Wallet,
  Smile,
  Lightbulb,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import { ZODIAC_SIGNS } from "@/lib/types/enums";
import { ForecastTranslation } from "@prisma/client";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

const BLOCKS_CONFIG = [
  {
    key: "love",
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    key: "money",
    icon: Wallet,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    key: "mood",
    icon: Smile,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    key: "advice",
    icon: Lightbulb,
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

async function getForecasts(locale: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const forecasts = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: today,
          lt: tomorrow,
        },
        translations: {
          some: {
            locale,
          },
        },
      },
      select: {
        zodiacSign: true,
        translations: true,
      },
    });
    return forecasts;
  } catch (error) {
    console.error("Error fetching forecasts:", error);
    return [];
  }
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ sign?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const forecasts = await getForecasts(locale);

  const tCommon = await getTranslations("Common");
  const t = await getTranslations("ForecastPage");

  const localizedZodiacSigns = tCommon.raw("zodiac_signs_array") as {
    id: string;
    name: string;
  }[];
  const zodiacSigns = ZODIAC_SIGNS.map((sign) => {
    const localized = localizedZodiacSigns.find((s) => s.id === sign.id);
    return {
      ...sign,
      name: localized ? localized.name : sign.id,
    };
  });

  const localizedBlocks = t.raw("blocks") as {
    key: string;
    title: string;
  }[];

  const selectedSign = params.sign || "leo";

  const forecast = forecasts.find((f) => f.zodiacSign === selectedSign);
  const sign = zodiacSigns.find((s) => s.id === selectedSign)!;

  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const blocks = BLOCKS_CONFIG.map((block) => ({
    ...block,
    title:
      localizedBlocks.find((b) => b.key === block.key)?.title ||
      block.key.charAt(0).toUpperCase() + block.key.slice(1),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <span className="font-serif text-lg">Daily Astro</span>
          </Link>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            asChild
          >
            <Link href="/subscribe">{t("subscribe")}</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-medium mb-2">
            {t("today_forecast")}
          </h1>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>

        {/* Zodiac selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-4xl mx-auto">
          {zodiacSigns.map((zodiac) => (
            <Link
              key={zodiac.id}
              href={`/forecast?sign=${zodiac.id}`}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                selectedSign === zodiac.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="mr-1">{zodiac.symbol}</span>
              <span className="hidden sm:inline">{zodiac.name}</span>
            </Link>
          ))}
        </div>

        {/* Forecast card */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card border-border/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center">
                <span className="text-4xl">{sign.symbol}</span>
              </div>
              <div>
                <h2 className="text-2xl font-serif font-medium">{sign.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("today_forecast")}
                </p>
              </div>
            </div>

            <CardContent className="p-6">
              {forecast ? (
                <div className="space-y-6">
                  {blocks.map((block) => (
                    <div key={block.key} className="flex gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${block.bg} flex items-center justify-center shrink-0`}
                      >
                        <block.icon className={`w-6 h-6 ${block.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">{block.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {forecast.translations[0][
                            block.key as keyof ForecastTranslation
                          ]?.toString() || t("no_data")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {t("forecast_isnt_ready")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("choose_another_sign")}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{t("get_daily_forecasts")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("get_in_telegram")}
                    </p>
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground whitespace-nowrap"
                    asChild
                  >
                    <Link href="/subscribe" className="flex items-center gap-2">
                      {t("seven_days_free")}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("disclaimer")}
          </p>
        </div>
      </main>
    </div>
  );
}
