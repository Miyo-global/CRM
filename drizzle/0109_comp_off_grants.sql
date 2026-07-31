-- Feature 7: Comp off grants (per-grant tracking with expiry)

CREATE TABLE IF NOT EXISTS comp_off_grants (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  holiday_work_request_id INTEGER REFERENCES holiday_work_requests(id),
  granted_days DECIMAL NOT NULL DEFAULT '1',
  used_days DECIMAL NOT NULL DEFAULT '0',
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'FULLY_USED')),
  granted_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_off_user_status ON comp_off_grants(user_id, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_comp_off_org ON comp_off_grants(org_id);
