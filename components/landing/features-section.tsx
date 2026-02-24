"use client";

import { Heart, Wallet, Smile, Lightbulb, Clock, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const features = [
  {
    id: 1,
    icon: Heart,
    color: "from-pink-500 to-rose-500",
  },
  {
    id: 2,
    icon: Wallet,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: 3,
    icon: Smile,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: 4,
    icon: Lightbulb,
    color: "from-indigo-500 to-purple-500",
  },
];

export function FeaturesSection() {
  const t = useTranslations("FeaturesSection");
  const localizedFeatures = t.raw("features") as {
    id: number;
    title: string;
    description: string;
  }[];

  return (
    <section className="relative py-20 px-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium mb-3">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="glass rounded-2xl p-5 text-center hover:scale-[1.02] transition-transform active:scale-[0.98]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-medium mb-1">
                {localizedFeatures.find((f) => f.id == feature.id)?.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {localizedFeatures.find((f) => f.id == feature.id)?.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional benefits */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>{t("delivery_time")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>{t("time_for_reading")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
