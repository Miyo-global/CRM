-- MIYO-0632: requisition history lives in ats_activity, and a requisition
-- exists before any candidate, so candidate_id becomes optional.
ALTER TABLE IF EXISTS "ats_activity" ALTER COLUMN "candidate_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "ats_activity" ADD COLUMN IF NOT EXISTS "requisition_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ats_activity" ADD CONSTRAINT "ats_activity_requisition_id_ats_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."ats_requisitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_activity_requisition" ON "ats_activity" USING btree ("requisition_id","created_at");
