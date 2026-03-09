-- Demerits table — admin-only visibility
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE IF NOT EXISTS demerits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date        date NOT NULL,
  note        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE demerits ENABLE ROW LEVEL SECURITY;

-- Only admins (is_admin = true in user_metadata) can read/write demerits
CREATE POLICY "Admins can read demerits"
  ON demerits FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert demerits"
  ON demerits FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete demerits"
  ON demerits FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
