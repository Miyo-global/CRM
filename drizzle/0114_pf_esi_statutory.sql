-- PF / ESI statutory deduction support.
-- All additive, IF NOT EXISTS, default zero so existing payrolls render unchanged.

ALTER TABLE "salary_structures"
  ADD COLUMN IF NOT EXISTS "pf_applicable" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "pf_employee_rate" numeric(5,2) DEFAULT '12',
  ADD COLUMN IF NOT EXISTS "pf_employer_rate" numeric(5,2) DEFAULT '12',
  ADD COLUMN IF NOT EXISTS "pf_wage_ceiling" numeric(10,2) DEFAULT '15000',
  ADD COLUMN IF NOT EXISTS "esi_applicable" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "esi_employee_rate" numeric(5,2) DEFAULT '0.75',
  ADD COLUMN IF NOT EXISTS "esi_employer_rate" numeric(5,2) DEFAULT '3.25',
  ADD COLUMN IF NOT EXISTS "esi_wage_ceiling" numeric(10,2) DEFAULT '21000';

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "pf_employee" numeric DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "pf_employer" numeric DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "esi_employee" numeric DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "esi_employer" numeric DEFAULT '0';
