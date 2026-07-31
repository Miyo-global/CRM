-- Feature 4+5: Holiday / Sunday work pre-approval requests

CREATE TABLE IF NOT EXISTS holiday_work_requests (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  request_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('HOLIDAY', 'SUNDAY')),
  holiday_id INTEGER REFERENCES holidays(id),
  reason TEXT NOT NULL,
  compensation_preference TEXT NOT NULL CHECK (compensation_preference IN ('EXTRA_PAY', 'COMP_OFF')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (org_id, user_id, request_date)
);

CREATE INDEX IF NOT EXISTS idx_hwr_org_status ON holiday_work_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_hwr_user ON holiday_work_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_hwr_date ON holiday_work_requests(org_id, request_date);
