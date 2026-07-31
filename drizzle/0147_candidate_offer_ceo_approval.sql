ALTER TABLE "candidate_offers" ADD COLUMN IF NOT EXISTS "submitted_for_ceo_at" timestamp;
ALTER TABLE "candidate_offers" ADD COLUMN IF NOT EXISTS "ceo_reviewed_by" text REFERENCES "users"("id");
ALTER TABLE "candidate_offers" ADD COLUMN IF NOT EXISTS "ceo_reviewed_at" timestamp;
ALTER TABLE "candidate_offers" ADD COLUMN IF NOT EXISTS "ceo_remarks" text;
