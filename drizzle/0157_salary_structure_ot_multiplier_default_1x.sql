-- MIYO-0016: overtime pays 1x per-day. New salary structures default to 1.00.
-- Existing rows are NOT rewritten here; see scripts/prod-checks/miyo-0016-ot-multipliers.sql.
ALTER TABLE "salary_structures" ALTER COLUMN "sunday_ot_multiplier" SET DEFAULT '1.00';
--> statement-breakpoint
ALTER TABLE "salary_structures" ALTER COLUMN "holiday_ot_multiplier" SET DEFAULT '1.00';
