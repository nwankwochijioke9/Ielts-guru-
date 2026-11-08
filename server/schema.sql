CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_ngn INTEGER NOT NULL DEFAULT 0 CHECK (price_ngn >= 0),
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