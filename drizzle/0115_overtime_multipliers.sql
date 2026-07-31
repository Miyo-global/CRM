-- Configurable overtime multipliers per salary structure (OPEN-05).
-- Defaults: Saturday 1×, Sunday 2×, holiday 2× (typical Indian convention).

ALTER TABLE "salary_structures"
  ADD COLUMN IF NOT EXISTS "saturday_ot_multiplier" numeric(4,2) DEFAULT '1.00',
  ADD COLUMN IF NOT EXISTS "sunday_ot_multiplier" numeric(4,2) DEFAULT '2.00',
  ADD COLUMN IF NOT EXISTS "holiday_ot_multiplier" numeric(4,2) DEFAULT '2.00';
