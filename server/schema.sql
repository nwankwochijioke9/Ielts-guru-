CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_ngn INTEGER NOT NULL DEFAULT 0 CHECK (price_ngn >= 0),
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS practice_attempts (
  id BIGSERIAL PRIMARY KEY,
  skill TEXT NOT NULL CHECK (skill IN ('listening','reading','writing','speaking')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  estimated_band NUMERIC(2,1),
  feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO plans (name, price_ngn, duration_days, features)
SELECT 'Free Starter', 0, 30, '["Sample practice","Basic progress tracking"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Free Starter');
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0);
INSERT INTO plans (name, price_ngn, price_usd, duration_days, features)
SELECT seed.name, seed.price_ngn, seed.price_usd, 30, seed.features::jsonb
FROM (VALUES
 ('Free Starter',0,0,'["5-day limited trial","Sample practice questions","One introductory AI writing review","Basic progress preview"]'),
 ('Basic',5000,4,'["Daily IELTS practice","Limited AI writing corrections","Academic and General Training practice","Basic progress tracking"]'),
 ('Standard',12000,9,'["Everything in Basic","More AI writing assessments and corrections","Full Listening and Reading practice sets","Speaking practice and feedback","Timed skill tests"]'),
 ('Premium',25000,19,'["Everything in Standard","Full IELTS mock-test access","Detailed AI writing feedback and model answers","Speaking transcript and assessment","Personalised improvement recommendations","Performance history and band tracking"]'),
 ('VIP',50000,39,'["Everything in Premium","Highest AI assessment allowance","Advanced performance analytics","Personalised study plan","Priority access to new practice materials","Comprehensive progress reports"]')
) AS seed(name,price_ngn,price_usd,features)
WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.name=seed.name);
