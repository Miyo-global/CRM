-- Add itemized deduction columns to payrolls so the payslip can render
-- and audit each component separately. All additive, idempotent.

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "half_days" numeric DEFAULT '0';

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "half_day_amount" numeric DEFAULT '0';

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "other_deductions" numeric DEFAULT '0';

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "structure_deductions" numeric DEFAULT '0';
