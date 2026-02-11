-- Daily Astro - Database Initialization Script
-- This script runs automatically when the PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE zodiac_sign AS ENUM (
      'aries', 'taurus', 'gemini', 'cancer', 
      'leo', 'virgo', 'libra', 'scorpio', 
      'sagittarius', 'capricorn', 'aquarius', 'pisces'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
      'trial', 'active', 'canceled', 'expired', 'grace'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
      'pending', 'succeeded', 'failed', 'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_name AS ENUM (
      'basic', 'plus', 'premium'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE,
  email VARCHAR(255),
  zodiac_sign zodiac_sign,
  birth_date DATE,
  timezone VARCHAR(64) DEFAULT 'Europe/Minsk',
  locale VARCHAR(10) DEFAULT 'ru',
  delivery_time TIME DEFAULT '07:30:00',
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_zodiac_sign ON users(zodiac_sign);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name plan_name UNIQUE NOT NULL,
  price_byn_month INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  start_at TIMESTAMPTZ DEFAULT NOW(),
  renew_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  payment_provider VARCHAR(32) DEFAULT 'bepaid',
  payment_token VARCHAR(255),
  last_payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renew_at ON subscriptions(renew_at);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  provider_payment_id VARCHAR(255),
  order_id VARCHAR(255) UNIQUE NOT NULL,
  amount_byn INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'BYN',
  status payment_status DEFAULT 'pending',
  is_recurring BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Astro Events table
CREATE TABLE IF NOT EXISTS astro_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_date DATE NOT NULL,
  planet VARCHAR(32) NOT NULL,
  sign zodiac_sign,
  aspect VARCHAR(64),
  magnitude FLOAT,
  source VARCHAR(128),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astro_events_date ON astro_events(event_date);

-- Forecasts table
CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_date DATE NOT NULL,
  zodiac_sign zodiac_sign NOT NULL,
  love TEXT NOT NULL,
  money TEXT NOT NULL,
  mood TEXT NOT NULL,
  advice TEXT NOT NULL,
  source JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forecast_date, zodiac_sign)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_date_sign ON forecasts(forecast_date, zodiac_sign);

-- Content templates library
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zodiac_sign zodiac_sign,
  trigger_type VARCHAR(64) NOT NULL,
  trigger_value VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL,
  text_ru TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_templates_trigger ON content_templates(trigger_type, trigger_value);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  forecast_id UUID REFERENCES forecasts(id),
  telegram_message_id VARCHAR(64),
  opened BOOLEAN DEFAULT FALSE,
  streak_count INTEGER DEFAULT 1,
  plan_snapshot JSONB DEFAULT '{}',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_user_date ON deliveries(user_id, delivery_date);

-- Partner zodiac for compatibility
CREATE TABLE IF NOT EXISTS user_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_sign zodiac_sign NOT NULL,
  partner_name VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift subscriptions
CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID REFERENCES users(id),
  recipient_telegram_id BIGINT,
  plan_id UUID NOT NULL REFERENCES plans(id),
  duration_days INTEGER DEFAULT 30,
  payment_id UUID REFERENCES payments(id),
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ,
  code VARCHAR(32) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default plans
INSERT INTO plans (id, name, price_byn_month, features, is_active) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'basic', 300, '{"daily_forecast": true, "love": true, "money": true, "mood": true, "advice": true}', true),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'plus', 600, '{"daily_forecast": true, "love": true, "money": true, "mood": true, "advice": true, "compatibility": true, "affirmations": true}', true),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'premium', 1200, '{"daily_forecast": true, "love": true, "money": true, "mood": true, "advice": true, "compatibility": true, "affirmations": true, "important_dates": true, "flexible_time": true, "no_ads": true}', true)
ON CONFLICT (name) DO UPDATE SET
  price_byn_month = EXCLUDED.price_byn_month,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- Seed content templates (check if empty first)
INSERT INTO content_templates (trigger_type, trigger_value, category, text_ru)
SELECT * FROM (VALUES
  ('moon_in_sign', 'aries', 'love', 'Луна в Овне зажигает страсть — действуйте решительно.'),
  ('moon_in_sign', 'aries', 'money', 'Импульсивные покупки сегодня лучше отложить.'),
  ('moon_in_sign', 'aries', 'mood', 'Энергия бьёт через край — направьте её в дело.'),
  ('moon_in_sign', 'aries', 'advice', 'Начните то, что давно откладывали.'),
  ('moon_in_sign', 'leo', 'love', 'Луна во Льве просит внимания — покажите чувства.'),
  ('moon_in_sign', 'leo', 'money', 'Хороший день для презентаций и переговоров.'),
  ('moon_in_sign', 'leo', 'mood', 'Творческий подъём — используйте его.'),
  ('moon_in_sign', 'leo', 'advice', 'Побалуйте себя чем-то приятным.'),
  ('moon_in_sign', 'taurus', 'love', 'Луна в Тельце ценит стабильность — укрепляйте связи.'),
  ('moon_in_sign', 'taurus', 'money', 'Практичные решения принесут результат.'),
  ('moon_in_sign', 'taurus', 'mood', 'Спокойствие — ваша сила сегодня.'),
  ('moon_in_sign', 'taurus', 'advice', 'Позаботьтесь о комфорте — это не лишнее.'),
  ('moon_in_sign', 'gemini', 'love', 'Разговоры сегодня важнее жестов.'),
  ('moon_in_sign', 'gemini', 'money', 'Информация — ваш главный актив.'),
  ('moon_in_sign', 'gemini', 'mood', 'Любопытство ведёт к открытиям.'),
  ('moon_in_sign', 'gemini', 'advice', 'Напишите тому, о ком давно думали.'),
  ('moon_in_sign', 'cancer', 'love', 'Забота о близких возвращается сторицей.'),
  ('moon_in_sign', 'cancer', 'money', 'Интуиция подскажет верное решение.'),
  ('moon_in_sign', 'cancer', 'mood', 'Дом — лучшее место сегодня.'),
  ('moon_in_sign', 'cancer', 'advice', 'Позвоните родным — они ждут.'),
  ('moon_in_sign', 'virgo', 'love', 'Внимание к деталям укрепит доверие.'),
  ('moon_in_sign', 'virgo', 'money', 'Проверьте документы и расчёты.'),
  ('moon_in_sign', 'virgo', 'mood', 'Порядок в делах — порядок в голове.'),
  ('moon_in_sign', 'virgo', 'advice', 'Составьте список дел — это поможет.'),
  ('moon_in_sign', 'libra', 'love', 'Гармония в отношениях требует компромисса.'),
  ('moon_in_sign', 'libra', 'money', 'Партнёрство может быть выгодным.'),
  ('moon_in_sign', 'libra', 'mood', 'Красота вокруг поднимает настроение.'),
  ('moon_in_sign', 'libra', 'advice', 'Найдите баланс между «надо» и «хочу».'),
  ('moon_in_sign', 'scorpio', 'love', 'Глубина чувств требует доверия.'),
  ('moon_in_sign', 'scorpio', 'money', 'Скрытые ресурсы могут проявиться.'),
  ('moon_in_sign', 'scorpio', 'mood', 'Интенсивность эмоций — это нормально.'),
  ('moon_in_sign', 'scorpio', 'advice', 'Отпустите то, что уже не нужно.'),
  ('moon_in_sign', 'sagittarius', 'love', 'Открытость привлекает — будьте искренни.'),
  ('moon_in_sign', 'sagittarius', 'money', 'Перспективы расширяются — смотрите дальше.'),
  ('moon_in_sign', 'sagittarius', 'mood', 'Оптимизм заразителен — делитесь им.'),
  ('moon_in_sign', 'sagittarius', 'advice', 'Запланируйте что-то новое на ближайшее время.'),
  ('moon_in_sign', 'capricorn', 'love', 'Серьёзный разговор сблизит вас.'),
  ('moon_in_sign', 'capricorn', 'money', 'Стратегическое мышление сегодня в приоритете.'),
  ('moon_in_sign', 'capricorn', 'mood', 'Дисциплина приносит удовлетворение.'),
  ('moon_in_sign', 'capricorn', 'advice', 'Поставьте конкретную цель на неделю.'),
  ('moon_in_sign', 'aquarius', 'love', 'Оригинальность привлекает внимание.'),
  ('moon_in_sign', 'aquarius', 'money', 'Нестандартные идеи могут сработать.'),
  ('moon_in_sign', 'aquarius', 'mood', 'Свобода мысли — ключ к хорошему дню.'),
  ('moon_in_sign', 'aquarius', 'advice', 'Попробуйте что-то совершенно новое.'),
  ('moon_in_sign', 'pisces', 'love', 'Романтика в воздухе — ловите момент.'),
  ('moon_in_sign', 'pisces', 'money', 'Творческий подход к финансам поможет.'),
  ('moon_in_sign', 'pisces', 'mood', 'Мечтательность сегодня уместна.'),
  ('moon_in_sign', 'pisces', 'advice', 'Найдите время для себя и тишины.'),
  ('moon_phase', 'new_moon', 'love', 'Новолуние — время для новых начинаний в отношениях.'),
  ('moon_phase', 'new_moon', 'money', 'Посадите семена будущих проектов.'),
  ('moon_phase', 'new_moon', 'advice', 'Поставьте намерение на лунный цикл.'),
  ('moon_phase', 'full_moon', 'love', 'Полнолуние усиливает эмоции — будьте мягче.'),
  ('moon_phase', 'full_moon', 'mood', 'Эмоции на пике — это временно.'),
  ('moon_phase', 'full_moon', 'advice', 'Завершите то, что начали две недели назад.'),
  ('day_of_week', 'monday', 'advice', 'Начните неделю с главного.'),
  ('day_of_week', 'friday', 'mood', 'Конец недели — отпустите напряжение.'),
  ('day_of_week', 'sunday', 'advice', 'Восстановите силы перед новой неделей.')
) AS v(trigger_type, trigger_value, category, text_ru)
WHERE NOT EXISTS (SELECT 1 FROM content_templates LIMIT 1);

SELECT 'Database initialized successfully!' as status;
