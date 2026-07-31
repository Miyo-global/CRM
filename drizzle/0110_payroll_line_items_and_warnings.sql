-- Feature 8: Payroll line items + unique constraint + late arrival warnings

ALTER TABLE payrolls
  ADD COLUMN IF NOT EXISTS lop_days DECIMAL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS lop_amount DECIMAL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS pt_amount DECIMAL DEFAULT '200',
  ADD COLUMN IF NOT EXISTS advance_recovery_amount DECIMAL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS special_allowance DECIMAL DEFAULT '0';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payroll_org_user_month ON payrolls(org_id, user_id, month);

CREATE TABLE IF NOT EXISTS late_arrival_warnings (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  warning_number INTEGER NOT NULL DEFAULT 1,
  attendance_id INTEGER REFERENCES attendance(id),
  noted_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_late_warnings_user ON late_arrival_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_late_warnings_org_date ON late_arrival_warnings(org_id, date);
