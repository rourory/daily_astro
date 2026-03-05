import createNextIntlPlugin from "next-intl/plugin";
import nextPWA from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Эти настройки помогают с App Router
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withPWA(withNextIntl(nextConfig));
