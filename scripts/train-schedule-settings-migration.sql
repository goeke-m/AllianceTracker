-- Train Schedule Settings table
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE train_schedule_settings (
  key        text        PRIMARY KEY CHECK (key = 'week_mode'),
  mode       text        NOT NULL DEFAULT 'push' CHECK (mode IN ('push', 'save')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO train_schedule_settings (key, mode) VALUES ('week_mode', 'push');

ALTER TABLE train_schedule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read train_schedule_settings"
  ON train_schedule_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update train_schedule_settings"
  ON train_schedule_settings FOR UPDATE
  TO authenticated
  USING (true);
