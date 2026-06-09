DROP TABLE IF EXISTS safety_events CASCADE;

CREATE TABLE safety_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(30) CHECK (event_type IN ('SOS', 'COMPARTMENT_VIOLATION', 'HAZARD_REPORT')),
    train_number VARCHAR,
    coach VARCHAR,
    berth VARCHAR,
    station_code VARCHAR,
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    alert_subtype VARCHAR(30),
    description TEXT,
    photo_url TEXT,
    audio_url TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    priority VARCHAR(10) DEFAULT 'HIGH',
    masked_initials VARCHAR(5),
    rpf_note TEXT,
    sms_sent BOOLEAN DEFAULT false,
    sms_contacts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_safety_events_user_id ON safety_events (user_id);
CREATE INDEX idx_safety_events_event_type ON safety_events (event_type);
CREATE INDEX idx_safety_events_status ON safety_events (status);
CREATE INDEX idx_safety_events_created_at ON safety_events (created_at);
CREATE INDEX idx_safety_events_train_number ON safety_events (train_number);
CREATE INDEX idx_safety_events_lat_lng ON safety_events (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_safety_events_active_critical_high ON safety_events (id) WHERE status = 'ACTIVE' AND priority IN ('CRITICAL', 'HIGH');

ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events" ON safety_events
    FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can select their own events" ON safety_events
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.jwt() ->> 'sub')
    );

ALTER TABLE safety_events REPLICA IDENTITY FULL;
