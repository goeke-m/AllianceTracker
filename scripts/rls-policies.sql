-- RLS policies for OPNz Tracker
-- Run this in Supabase SQL Editor (Project > SQL Editor)

-- members: authenticated users can read; admins can write
CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (true);

-- damage_logs: authenticated users can read; write is open to authenticated
CREATE POLICY "Authenticated users can read damage_logs"
  ON damage_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert damage_logs"
  ON damage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update damage_logs"
  ON damage_logs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete damage_logs"
  ON damage_logs FOR DELETE
  TO authenticated
  USING (true);

-- train_schedule: authenticated users can read and write
CREATE POLICY "Authenticated users can read train_schedule"
  ON train_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert train_schedule"
  ON train_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update train_schedule"
  ON train_schedule FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete train_schedule"
  ON train_schedule FOR DELETE
  TO authenticated
  USING (true);

-- ooto: authenticated users can read and write
CREATE POLICY "Authenticated users can read ooto"
  ON ooto FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ooto"
  ON ooto FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ooto"
  ON ooto FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete ooto"
  ON ooto FOR DELETE
  TO authenticated
  USING (true);
