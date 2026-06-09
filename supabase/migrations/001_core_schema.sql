-- 001_core_schema.sql
-- Core DB schema setup for users, journeys, and admin_users

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               VARCHAR(15) UNIQUE NOT NULL,
  name                VARCHAR(100),
  firebase_uid        VARCHAR(128) UNIQUE,
  emergency_contacts  TEXT[] DEFAULT '{}',
  preferred_class     VARCHAR(5) DEFAULT 'SL',
  frequent_routes     TEXT[] DEFAULT '{}',
  is_verified         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Table: journeys
CREATE TABLE IF NOT EXISTS journeys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pnr                 VARCHAR(10) NOT NULL,
  train_number        VARCHAR(10),
  train_name          VARCHAR(100),
  boarding_station    VARCHAR(10),
  destination_station VARCHAR(10),
  travel_date         DATE,
  coach               VARCHAR(10),
  berth               VARCHAR(10),
  class               VARCHAR(5),
  status              VARCHAR(20), -- CONFIRMED, RAC, WL
  raw_api_response    JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for journeys
CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_pnr ON journeys(pnr);
CREATE INDEX IF NOT EXISTS idx_journeys_travel_date ON journeys(travel_date);

-- Table: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(20) DEFAULT 'viewer', -- viewer | zone_officer | superadmin
  zone        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_own_data'
  ) THEN
    CREATE POLICY "users_own_data" ON users
      FOR ALL USING (firebase_uid = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON users
      FOR ALL TO service_role USING (true);
  END IF;
END $$;

ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'journeys' AND policyname = 'journeys_own_data'
  ) THEN
    CREATE POLICY "journeys_own_data" ON journeys
      FOR ALL USING (user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'journeys' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON journeys
      FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- Add UNIQUE constraint to journeys for upsert mapping (user_id + pnr)
ALTER TABLE journeys ADD CONSTRAINT unique_user_pnr UNIQUE (user_id, pnr);
