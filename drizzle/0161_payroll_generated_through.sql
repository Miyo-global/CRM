-- Last day the attendance was counted up to, so a payroll generated before
-- the month ended says so (MIYO-0074).
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "generated_through" date;
