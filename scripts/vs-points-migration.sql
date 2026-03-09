-- VS Points table — admin-only visibility
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE IF NOT EXISTS vs_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_ending date NOT NULL,
  points      integer NOT NULL CHECK (points >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vs_points ENABLE ROW LEVEL SECURITY;

-- Only admins (is_admin = true in user_metadata) can read/write vs_points
CREATE POLICY "Admins can read vs_points"
  ON vs_points FOR SELECTcan t
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert vs_points"
  ON vs_points FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete vs_points"
  ON vs_points FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
