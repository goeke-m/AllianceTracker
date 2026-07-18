-- Storm events tables (Desert Storm + Canyon Storm)
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE IF NOT EXISTS storm_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL CHECK (event_type IN ('ds', 'canyon')),
  week_start  date NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, week_start)
);

CREATE TABLE IF NOT EXISTS storm_roster (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES storm_events(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team        text NOT NULL CHECK (team IN ('A', 'B')),
  role        text NOT NULL CHECK (role IN ('participant', 'substitute')),
  attendance  text CHECK (attendance IN ('present', 'no_show', 'subbed_in')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

ALTER TABLE storm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE storm_roster ENABLE ROW LEVEL SECURITY;

-- storm_events: authenticated read, admin write
CREATE POLICY "Authenticated users can read storm_events"
  ON storm_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert storm_events"
  ON storm_events FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update storm_events"
  ON storm_events FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete storm_events"
  ON storm_events FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- storm_roster: authenticated read, admin write
CREATE POLICY "Authenticated users can read storm_roster"
  ON storm_roster FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert storm_roster"
  ON storm_roster FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update storm_roster"
  ON storm_roster FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete storm_roster"
  ON storm_roster FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
