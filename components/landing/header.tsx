"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Menu, X, ChevronDown, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
// ВАЖНО: usePathname должен быть из твоего файла конфигурации next-intl
import { Link as LocalizedLink, usePathname } from "@/lib/navigation";
import { locales } from "@/i18n";

const languageNames: Record<string, string> = {
  by: "Русский (Беларусь)",
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
  zh: "中文",
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();

  // Закрытие дропдауна при скролле (для красоты)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (isLangOpen) setIsLangOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });

  // Компонент самого Dropdown'а, чтобы не дублировать код для моб/десктопа
  const LanguageSwitcher = () => (
    <div className="relative">
      <button
        onClick={() => setIsLangOpen(!isLangOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase">{locale}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isLangOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Невидимый фон для закрытия по клику вне дропдауна */}
      {isLangOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsLangOpen(false)}
        />
      )}

      {/* Выпадающее меню */}
      {isLangOpen && (
        <div className="absolute top-full right-0 mt-2 w-36 glass bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg rounded-xl overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {locales.map((lang) => (
            <LocalizedLink
              key={lang}
              href={pathname}
              locale={lang}
              onClick={() => setIsLangOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 ${
                locale === lang
                  ? "text-foreground font-medium bg-muted/40"
                  : "text-muted-foreground"
              }`}
            >
              {languageNames[lang] || lang.toUpperCase()}
              {locale === lang && <Check className="w-4 h-4" />}
            </LocalizedLink>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "glass shadow- border-b border-border/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[630px] mx-auto px-4 py-3 flex items-center justify-between">
        <LocalizedLink href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from- to- flex items-center justify-center shadow-sm">
            <Star className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif font-medium text-lg tracking-tight mr-4">
            Daily Astro
          </span>
        </LocalizedLink>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-5">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("possibilities")}
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("pricing")}
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            FAQ
          </a>
          <div className="w-px h-4 bg-border/50" /> {/* Разделитель */}
          <LanguageSwitcher />
          <Button
            size="sm"
            className="rounded-xl font-medium shadow-sm"
            asChild
          >
            <LocalizedLink href="/subscribe">{t("start")}</LocalizedLink>
          </Button>
        </div>

        {/* Mobile Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <LanguageSwitcher />

          <button
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden glass absolute top-full left-0 right-0 border-b border-border/30 px-4 py-4 space-y-3 animate-in slide-in-from-top-4 fade-in duration-200 shadow-xl">
          <a
            href="#features"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setIsMenuOpen(false)}
          >
            {t("possibilities")}
          </a>
          <a
            href="#pricing"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setIsMenuOpen(false)}
          >
            {t("pricing")} {/* Заменил хардкод "Тарифы" на перевод */}
          </a>
          <a
            href="#faq"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setIsMenuOpen(false)}
          >
            FAQ
          </a>
          <Button className="w-full rounded-xl mt-2" asChild>
            <LocalizedLink
              href="/subscribe"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("start_free")}
            </LocalizedLink>
          </Button>
        </div>
      )}
    </header>
  );
}
