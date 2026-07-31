ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS applied_title TEXT,
  ADD COLUMN IF NOT EXISTS applied_department TEXT,
  ADD COLUMN IF NOT EXISTS skill_entries JSONB;
