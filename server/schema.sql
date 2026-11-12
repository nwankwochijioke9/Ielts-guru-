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
SELECT seed.name, seed.price_ngn, seed.price_usd, CASE WHEN seed.name='Free Starter' THEN 3 ELSE 30 END, seed.features::jsonb
FROM (VALUES
 ('Free Starter',0,0,'["3-day limited trial","Sample practice questions","One introductory AI writing review","Basic progress preview"]'),
 ('Basic',5000,4,'["Daily IELTS practice","Limited AI writing corrections","Academic and General Training practice","Basic progress tracking"]'),
 ('Standard',12000,9,'["Everything in Basic","More AI writing assessments and corrections","Full Listening and Reading practice sets","Speaking practice and feedback","Timed skill tests"]'),
 ('Premium',25000,19,'["Everything in Standard","Full IELTS mock-test access","Detailed AI writing feedback and model answers","Speaking transcript and assessment","Personalised improvement recommendations","Performance history and band tracking"]'),
 ('VIP',50000,39,'["Everything in Premium","Highest AI assessment allowance","Advanced performance analytics","Personalised study plan","Priority access to new practice materials","Comprehensive progress reports"]')
) AS seed(name,price_ngn,price_usd,features)
WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.name=seed.name);

CREATE TABLE IF NOT EXISTS free_trials (
  trial_id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  ai_reviews_used INTEGER NOT NULL DEFAULT 0 CHECK (ai_reviews_used >= 0)
);

UPDATE plans
SET duration_days=3,
    features='["3-day limited trial","Sample practice questions","One introductory AI writing review","Basic progress preview"]'::jsonb
WHERE name='Free Starter';
ALTER TABLE free_trials ALTER COLUMN expires_at
SET DEFAULT (NOW() + INTERVAL '3 days');

CREATE TABLE IF NOT EXISTS learners (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE free_trials ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES learners(id);
CREATE UNIQUE INDEX IF NOT EXISTS free_trials_user_id_unique ON free_trials(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES learners(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS practice_attempts_user_created_idx ON practice_attempts(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS learner_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS learner_sessions_expiry_idx ON learner_sessions(expires_at);

DROP INDEX IF EXISTS free_trials_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS free_trials_user_id_unique ON free_trials(user_id);

ALTER TABLE learners ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS learners_verification_token_idx ON learners(email_verification_token_hash);
CREATE TABLE IF NOT EXISTS payment_transactions (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,plan_id INTEGER NOT NULL REFERENCES plans(id),tx_ref TEXT NOT NULL UNIQUE,amount NUMERIC(12,2) NOT NULL,currency TEXT NOT NULL DEFAULT 'NGN',status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','successful','failed')),provider_transaction_id TEXT,paid_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS subscriptions (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,plan_id INTEGER NOT NULL REFERENCES plans(id),payment_ref TEXT NOT NULL UNIQUE,starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions(user_id,status,ends_at);

CREATE TABLE IF NOT EXISTS listening_audio_cache (
  cache_key TEXT PRIMARY KEY,
  audio_data BYTEA NOT NULL,
  segment_count INTEGER NOT NULL CHECK (segment_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
