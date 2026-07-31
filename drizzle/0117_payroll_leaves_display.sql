-- HR-entered Leaves count shown on the payslip. Display-only; does not
-- affect any earnings/deductions calculation. NULL keeps the existing
-- behaviour (count approved leave requests in the month).

ALTER TABLE "payrolls"
  ADD COLUMN IF NOT EXISTS "leave_days_display" numeric;
