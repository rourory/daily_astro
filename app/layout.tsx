export const metadata = {
  // manifest: "/manifest.json",
  title: "Daily Astro — Ежедневные гороскопы в Telegram",
  description:
    "Персональные гороскопы каждый день в Telegram. Любовь, деньги, настроение, совет дня. 7 дней бесплатно.",
  keywords: [
    "гороскоп",
    "астрология",
    "telegram",
    "ежедневный прогноз",
    "знак зодиака",
    "гороскоп на сегодня",
  ],
  authors: [{ name: "Daily Astro" }],
  // metadataBase: new URL("https://dailyastro.site"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Daily Astro — Ежедневные гороскопы в Telegram",
    description: "Персональные гороскопы каждый день. Коротко. Точно. Вовремя.",
    type: "website",
    locale: "ru_RU",
    siteName: "Daily Astro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Astro — Ежедневные гороскопы",
    description: "Персональные гороскопы каждый день в Telegram",
  },
  robots: {
    index: true,
    follow: true,
  },
  generator: "v0.app",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
