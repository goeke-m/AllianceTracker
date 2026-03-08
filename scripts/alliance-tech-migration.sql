-- Alliance Tech Status table
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE alliance_tech_status (
  key        text        PRIMARY KEY CHECK (key IN ('current', 'next')),
  tech_name  text        NOT NULL,
  category   text        NOT NULL CHECK (category IN ('development', 'war')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alliance_tech_status ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can read; all authenticated users can write
CREATE POLICY "Authenticated users can read alliance_tech_status"
  ON alliance_tech_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alliance_tech_status"
  ON alliance_tech_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alliance_tech_status"
  ON alliance_tech_status FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete alliance_tech_status"
  ON alliance_tech_status FOR DELETE
  TO authenticated
  USING (true);
