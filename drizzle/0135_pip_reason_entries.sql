ALTER TABLE "performance_improvement_plans"
  ADD COLUMN IF NOT EXISTS "reason_entries" jsonb;
