// Database types matching the SQL schema

export type ZodiacSign =
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
  | "pisces"
  | "nosign"

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "canceled"
  | "expired"
  | "grace";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type PlanName = "basic" | "plus" | "premium";

export interface User {
  id: string;
  telegram_id: number;
  email: string | null;
  zodiac_sign: ZodiacSign;
  birth_date: string | null;
  timezone: string;
  locale: string;
  delivery_time: string;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: PlanName;
  price_byn_month: number; // in kopecks
  features: PlanFeatures;
  is_active: boolean;
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
  trial_ends_at: string | null;
  start_at: string;
  renew_at: string | null;
  canceled_at: string | null;
  payment_provider: string;
  payment_token: string | null;
  last_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider_payment_id: string | null;
  order_id: string;
  amount_byn: number;
  currency: string;
  status: PaymentStatus;
  is_recurring: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Forecast {
  id: string;
  forecast_date: string;
  zodiac_sign: ZodiacSign;
  love: string;
  money: string;
  mood: string;
  advice: string;
  source: ForecastSource;
  generated_at: string;
}

export interface PlanetPosition {
  name: string;          // Sun, Moon, Mars...
  sign: string;          // Aquarius, Pisces...
  degree: number;        // 17.59
  absolute_degree: number;
  retrograde: boolean;
}

export interface ForecastSourceEphem {
  source: string;        // "Ephem_Realtime_Calc"
  planets: PlanetPosition[];
  timestamp: string;     // ISO
}

export type ForecastSource =
  | string
  | ForecastSourceEphem;


export interface AstroEvent {
  id: string;
  event_date: string;
  planet: string;
  sign: ZodiacSign | null;
  aspect: string | null;
  magnitude: number | null;
  source: string | null;
  description: string | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  user_id: string;
  delivery_date: string;
  forecast_id: string | null;
  telegram_message_id: string | null;
  opened: boolean;
  streak_count: number;
  plan_snapshot: Record<string, unknown>;
  delivered_at: string | null;
  created_at: string;
}

// API Response types
export interface BePaidWebhookPayload {
  status: "succeeded" | "failed" | "pending";
  order_id: string;
  payment_id: string;
  payment_token?: string;
  amount: number;
  currency: string;
  recurring?: boolean;
}

export interface CheckoutInitRequest {
  user_id: string;
  plan_id: string;
  return_url: string;
}

export interface CheckoutInitResponse {
  checkout_url: string;
  order_id: string;
}

// Ключи знаков зодиака
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

// Данные о совместимости (Plan: Plus)
export interface CompatibilityData {
  sign: ZodiacSignKey; // Знак партнера
  text: string;        // Описание почему
}

// Удачные метрики (Plan: Premium)
export interface LuckyMetricsData {
  number: number;
  time: string; // Например "14:00 - 16:00"
  color: string;
}

// Основная структура прогноза для одного знака
export interface IDailyForecast {
  id: string;
  zodiac_sign: ZodiacSignKey;
  forecast_date: Date;
  source: ForecastSource;
  generated_at: Date;

  // --- BASIC PLAN ---
  love: string;
  money: string;
  mood: string;
  advice: string;

  // --- PLUS PLAN ---
  affirmation: string;
  compatibility: CompatibilityData;

  // --- PREMIUM PLAN ---
  lucky_metrics: LuckyMetricsData;
  tomorrow_insight: string; // Инсайт/Тизер на завтра
}

// Полный ответ от AI (карта всех знаков)
export type AIResponseData = Record<ZodiacSignKey, IDailyForecast>;

// Тип пейлоуда, который приходит в POST запрос API
export interface IIncomingWebhookPayload {
  date: string; // YYYY-MM-DD
  forecasts: AIResponseData;
  raw_astronomy_data: any; // Можно типизировать строже, если нужно сохранять эфемериды
}