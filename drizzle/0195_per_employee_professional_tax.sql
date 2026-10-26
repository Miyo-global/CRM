-- Per-employee professional tax. PT is no longer computed from hardcoded bands:
-- each salary structure carries the employee's monthly amount, NULL meaning
-- "not applicable" (payroll deducts 0).
--
-- Existing structures are reset to NULL on purpose, with no backfill. Payroll
-- ignored every stored value except 0 (it used the bands), and 0 and NULL now
-- both deduct nothing, so no value that payroll actually used is lost. HR sets
-- each employee's PT after this ships. salary_revision_history keeps the old
-- new_pt figures for reference.
ALTER TABLE "salary_structures"
  ALTER COLUMN "professional_tax" TYPE numeric(10, 2) USING "professional_tax"::numeric(10, 2);--> statement-breakpoint
UPDATE "salary_structures" SET "professional_tax" = NULL WHERE "professional_tax" IS NOT NULL;--> statement-breakpoint
-- Payslip snapshot: saved payslips keep the PT they were generated with. NULL
-- rows (never deducted, see payslip-view-model) become 0; the 200 default goes.
UPDATE "payrolls" SET "pt_amount" = 0 WHERE "pt_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "payrolls"
  ALTER COLUMN "pt_amount" TYPE numeric(10, 2) USING "pt_amount"::numeric(10, 2),
  ALTER COLUMN "pt_amount" SET DEFAULT 0,
  ALTER COLUMN "pt_amount" SET NOT NULL;
