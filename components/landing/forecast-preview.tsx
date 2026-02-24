"use client";

import { useState } from "react";
import { Heart, Wallet, Smile, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ZODIAC_SIGNS } from "@/lib/types/enums";

const previewBlocks = [
  { key: "love", icon: Heart, color: "text-rose-400" },
  { key: "money", icon: Wallet, color: "text-emerald-400" },
  { key: "mood", icon: Smile, color: "text-amber-400" },
  { key: "advice", icon: Lightbulb, color: "text-primary" },
];

export function ForecastPreview() {
  const [selectedSign, setSelectedSign] = useState("leo");

  const tCommon = useTranslations("Common");
  const localizedZodiacSigns = tCommon.raw("zodiac_signs_array") as {
    id: string;
    name: string;
  }[];
  
  const t = useTranslations("ForecastPreview");
  const localizedSampleForecasts = t.raw("sample_forecasts") as Record<
    string,
    { love: string; money: string; mood: string; advice: string }
  >;
  const localizedPreviewBlocks = t.raw("preview_blocks") as {
    key: string;
    title: string;
  }[];

  const forecast = localizedSampleForecasts[selectedSign];
  const sign = ZODIAC_SIGNS.find((s) => s.id === selectedSign)!;

  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <section id="preview" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-4">
            {t("what_you_get")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("pick_your_sign")}
          </p>
        </div>

        {/* Zodiac selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-3xl mx-auto">
          {ZODIAC_SIGNS.map((zodiac) => (
            <button
              key={zodiac.id}
              onClick={() => setSelectedSign(zodiac.id)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-all",
                selectedSign === zodiac.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="mr-1">{zodiac.symbol}</span>
              <span className="hidden sm:inline">
                {localizedZodiacSigns.find((s) => s.id === zodiac.id)?.name}
              </span>
            </button>
          ))}
        </div>

        {/* Phone mockup */}
        <div className="max-w-sm mx-auto">
          <div className="bg-card rounded-3xl border border-border p-4 shadow-2xl">
            {/* Phone header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs text-muted-foreground">Telegram</span>
              <span className="text-xs text-muted-foreground">07:30</span>
            </div>

            {/* Message */}
            <div className="bg-secondary rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xl">{sign.symbol}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t("today_for")}{" "}
                    {
                      localizedZodiacSigns.find((s) => s.id === selectedSign)
                        ?.name
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">{today}</p>
                </div>
              </div>

              <div className="space-y-4">
                {previewBlocks.map((block) => (
                  <div key={block.key} className="flex gap-3">
                    <block.icon
                      className={`w-5 h-5 ${block.color} shrink-0 mt-0.5`}
                    />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {
                          localizedPreviewBlocks.find(
                            (b) => b.key === block.key,
                          )?.title
                        }
                      </p>
                      <p className="text-sm">
                        {forecast[block.key as keyof typeof forecast]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Streak */}
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("streak")} 🔥</span>
                <span className="text-primary cursor-pointer hover:underline">
                  {t("change_time")}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 px-3 bg-muted/50 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                {t("save")}
              </button>
              <button className="flex-1 py-2 px-3 bg-muted/50 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                {t("share")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
