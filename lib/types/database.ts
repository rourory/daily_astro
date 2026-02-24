// === ENUMS ===

export type ZodiacSignKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "canceled"
  | "expired"
  | "grace"
  | "paused";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded"
  | "canceled";

export type PlanName = "basic" | "plus" | "premium";

export type Currency = "BYN" | "RUB" | "USD" | "EUR" | "CNY";

// === DATABASE MODELS (Internal representation) ===

export interface User {
  id: string;
  telegram_id: number | null;
  email: string | null;
  zodiac_sign: ZodiacSignKey | null;
  birth_date: string | null;
  timezone: string;
  locale: string; // "ru", "en", "es"...
  country_code: string | null; // "RU", "US"...
  delivery_time: string;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanPrice {
  currency: Currency;
  amount: number; // in minor units (cents/kopecks)
}

export interface Plan {
  id: string;
  name: PlanName;
  features: PlanFeatures;
  is_active: boolean;
  prices: PlanPrice[]; // Массив цен для разных валют
  created_at: string;
}

export interface PlanFeatures {
  daily_forecast: boolean;
  compatibility: boolean;
  affirmations: boolean;
  important_dates: boolean;
  flexible_time: boolean;
  no_ads: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  currency: Currency;
  price_amount: number; // Цена продления
  trial_ends_at: string | null;
  start_at: string;
  renew_at: string | null;
  canceled_at: string | null;
  payment_provider: string; // "yookassa", "stripe"...
  payment_token: string | null;
  external_sub_id: string | null; // ID подписки в Stripe/PayPal
  last_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

// === FORECAST DATA STRUCTURES ===

// Данные о совместимости (Plan: Plus)
export interface CompatibilityData {
  sign: ZodiacSignKey | string; // Знак партнера
  text: string;                 // Описание (локализованное)
}

// Удачные метрики (Plan: Premium) - Языконезависимые данные
export interface LuckyMetricsData {
  number: number;
  time: string; // "14:00 - 16:00"
  color: string; // Текст цвета, к сожалению, зависит от языка, если не слать HEX
}

// Входящий прогноз для конкретного знака (уже локализованный)
export interface IDailyForecastIncoming {
  // --- BASIC PLAN ---
  love: string;
  money: string;
  mood: string;
  advice: string;

  // --- PLUS PLAN ---
  affirmation: string; // empty string if none
  compatibility: CompatibilityData;

  // --- PREMIUM PLAN ---
  lucky_metrics: LuckyMetricsData;
  tomorrow_insight: string; // empty string if none
}

// Полный ответ от AI генератора (карта всех знаков)
export type AIForecastMap = Record<ZodiacSignKey, IDailyForecastIncoming>;

// === WEBHOOK PAYLOAD ===

export interface IIncomingWebhookPayload {
  locale: string; // ВАЖНО: "ru", "en", etc.
  date: string;   // YYYY-MM-DD
  forecasts: AIForecastMap;
  raw_astronomy_data?: any;
}