"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { XCircle, LifeBuoy, Repeat } from "lucide-react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export default function CheckoutErrorPage() {
  const [showContent, setShowContent] = useState(false);
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    // reveal animation
    setTimeout(() => setShowContent(true), 300);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div
        className={`text-center max-w-sm transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Error icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className="font-serif text-2xl font-medium text-rose-600">
            {t("sorry")}
          </h1>
        </div>

        <p className="text-muted-foreground mb-8">{t("error_message")}</p>

        <div className="glass rounded-2xl p-4 mb-6 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{t("need_help")}</p>
              <p className="text-xs text-muted-foreground">{t("contact_support")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full py-6 rounded-2xl glow" asChild>
            <Link href="/checkout">
              <a className="flex items-center justify-center gap-2">
                <Repeat className="w-4 h-4" />
                {t("try_again")}
              </a>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full py-6 rounded-2xl glass"
            asChild
          >
            <a href="mailto:support@example.com">{t("contact_via_email")}</a>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full py-6 rounded-2xl glass"
            asChild
          >
            <Link href="/">{t("return_home")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
