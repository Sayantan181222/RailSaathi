-- 002_update_safety_events.sql
-- Migration to rename columns and change types on safety_events table

-- 1. Rename 'type' to 'event_type'
ALTER TABLE safety_events RENAME COLUMN type TO event_type;

-- 2. Rename and convert 'resolved' (boolean) to 'status' (varchar)
ALTER TABLE safety_events RENAME COLUMN resolved TO status;
ALTER TABLE safety_events ALTER COLUMN status TYPE VARCHAR(20) USING (CASE WHEN status THEN 'RESOLVED' ELSE 'ACTIVE' END);
ALTER TABLE safety_events ALTER COLUMN status SET DEFAULT 'ACTIVE';
