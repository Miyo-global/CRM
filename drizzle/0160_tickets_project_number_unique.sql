-- Ticket numbers (KEY-123) are unique per project among live tickets
-- (MIYO-0068). Numbering already runs under an advisory lock; this makes a
-- duplicate from a bug or a manual insert fail instead of silently landing.
-- Prod had no duplicates when this was written (checked 17 Oct 2026).
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_tickets_project_number_live" ON "tickets" USING btree ("project_id","ticket_number") WHERE "tickets"."deleted_at" is null;
