-- An approved expense becomes a reimbursement to pay out (A41), so the two
-- lists cannot disagree. The link is unique: approving the same expense twice
-- never creates a second reimbursement.
ALTER TABLE "reimbursements" ADD COLUMN IF NOT EXISTS "expense_id" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reimbursements"
    ADD CONSTRAINT "reimbursements_expense_id_expenses_id_fk"
    FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_reimbursements_expense" ON "reimbursements" ("expense_id");
