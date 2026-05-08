-- Add stable game UID column for lastwar.tools API matching.
-- Nullable so existing rows are unaffected until first sync.
ALTER TABLE members ADD COLUMN IF NOT EXISTS game_uid TEXT UNIQUE;
