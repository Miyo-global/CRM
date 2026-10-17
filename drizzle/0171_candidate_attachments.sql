-- MIYO-0647: candidate_documents also holds plain uploads now.
ALTER TABLE IF EXISTS "candidate_documents" ADD COLUMN IF NOT EXISTS "file_key" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_documents" ADD COLUMN IF NOT EXISTS "file_name" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_documents" ADD COLUMN IF NOT EXISTS "file_size" integer;
