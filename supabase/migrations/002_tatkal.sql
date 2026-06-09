DROP TABLE IF EXISTS tatkal_requests CASCADE;
DROP TABLE IF EXISTS tatkal_surrenders CASCADE;

CREATE TABLE IF NOT EXISTS tatkal_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10),
  class               VARCHAR(5) NOT NULL,
  passengers          JSONB NOT NULL,
  is_urgent           BOOLEAN DEFAULT false,
  urgency_reason      VARCHAR(20),
  urgency_document_url TEXT,
  urgency_score       NUMERIC(3,1) DEFAULT 0,
  scheduled_fire_time TIMESTAMPTZ NOT NULL,
  status              VARCHAR(20) DEFAULT 'PENDING',
  simulated_pnr       VARCHAR(10),
  fired_at            TIMESTAMPTZ,
  result_payload      JSONB,
  booking_date        DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tatkal_one_per_day
  ON tatkal_requests(user_id, booking_date)
  WHERE status NOT IN ('CANCELLED', 'FAILED');

CREATE INDEX IF NOT EXISTS idx_tatkal_user_id ON tatkal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tatkal_status ON tatkal_requests(status);
CREATE INDEX IF NOT EXISTS idx_tatkal_fire_time ON tatkal_requests(scheduled_fire_time);

CREATE TABLE IF NOT EXISTS tatkal_surrenders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  pnr                 VARCHAR(10) NOT NULL,
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10),
  class               VARCHAR(5),
  status              VARCHAR(20) DEFAULT 'LISTED',
  listed_at           TIMESTAMPTZ DEFAULT NOW(),
  matched_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surrenders_status ON tatkal_surrenders(status);
CREATE INDEX IF NOT EXISTS idx_surrenders_owner ON tatkal_surrenders(owner_user_id);
