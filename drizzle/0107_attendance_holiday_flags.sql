-- Feature 3: Attendance holiday/Sunday flags

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS is_holiday_work BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_sunday_work BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS holiday_id INTEGER REFERENCES holidays(id);

CREATE INDEX IF NOT EXISTS idx_attendance_holiday_work ON attendance(org_id, is_holiday_work) WHERE is_holiday_work = TRUE;
