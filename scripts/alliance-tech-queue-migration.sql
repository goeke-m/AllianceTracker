-- Alliance Tech Queue table
-- Run this in Supabase SQL Editor (Project > SQL Editor)

CREATE TABLE alliance_tech_queue (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  position   integer     NOT NULL,
  tech_name  text        NOT NULL,
  category   text        NOT NULL CHECK (category IN ('development', 'war')),
  completed  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alliance_tech_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can read; all authenticated users can write
CREATE POLICY "Authenticated users can read alliance_tech_queue"
  ON alliance_tech_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alliance_tech_queue"
  ON alliance_tech_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alliance_tech_queue"
  ON alliance_tech_queue FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete alliance_tech_queue"
  ON alliance_tech_queue FOR DELETE
  TO authenticated
  USING (true);
