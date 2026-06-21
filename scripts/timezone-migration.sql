-- Rename the unused free-text Availability column to Timezone.
-- Existing values are NULL in practice, so a plain rename preserves the column untouched.
ALTER TABLE members RENAME COLUMN "Availability" TO "Timezone";
