-- MIYO-0655: is this application ready to move, or waiting on something?
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "kanban_state" text DEFAULT 'READY';--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "kanban_reason" text;
