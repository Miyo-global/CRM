ALTER TABLE "career_ladders"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "track_type" text,
  ADD COLUMN IF NOT EXISTS "visibility" text NOT NULL DEFAULT 'all';
