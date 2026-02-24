import { Link } from "@/lib/navigation";
import { Star, Send, Heart } from "lucide-react";
// import Link from "next/link"
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("FooterSection");

  return (
    <footer className="py-12 px-6 border-t border-border/30 safe-bottom">
      <div className="max-w-lg mx-auto">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-lg font-medium">Daily Astro</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("personalized_horoscope")}
          </p>
          <a
            href="https://t.me/Dailyastrobelarusbot"
            className="inline-flex items-center gap-2 px-5 py-2.5 glass rounded-full text-sm hover:bg-white/10 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send className="w-4 h-4" />
            {t("open_on_telegram")}
          </a>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-8">
          <a
            href="#pricing"
            className="hover:text-foreground transition-colors"
          >
            {t("pricing")}
          </a>
          <span className="text-border">•</span>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
          <span className="text-border">•</span>
          <Link
            href="/forecast"
            className="hover:text-foreground transition-colors"
          >
            {t("free_forecast")}
          </Link>
        </div>

        {/* Bottom */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            © 2025 Daily Astro · dailyastro.site
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            {t("made_with")}{" "}
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> {t("by")}
          </p>
        </div>
      </div>
    </footer>
  );
}
