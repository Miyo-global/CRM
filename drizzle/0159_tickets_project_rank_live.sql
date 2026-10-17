-- Board, list and overview load the live tickets of one project in rank
-- order on every visit (MIYO-0066). Partial so soft-deleted rows stay out.
CREATE INDEX IF NOT EXISTS "idx_tickets_project_rank_live" ON "tickets" USING btree ("project_id","rank") WHERE "tickets"."deleted_at" is null;
