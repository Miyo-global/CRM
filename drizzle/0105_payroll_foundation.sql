-- Feature 1: Salary structure improvements + revision history

ALTER TABLE salary_structures
  ALTER COLUMN hra_percentage SET DEFAULT '50',
  ADD COLUMN IF NOT EXISTS special_allowance DECIMAL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS professional_tax DECIMAL DEFAULT '200',
  ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS salary_revision_history (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  salary_structure_id INTEGER REFERENCES salary_structures(id),
  previous_basic DECIMAL,
  previous_hra_pct DECIMAL,
  previous_special_allowance DECIMAL,
  previous_pt DECIMAL,
  new_basic DECIMAL NOT NULL,
  new_hra_pct DECIMAL NOT NULL,
  new_special_allowance DECIMAL NOT NULL,
  new_pt DECIMAL NOT NULL,
  effective_from DATE NOT NULL,
  reason TEXT,
  changed_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_revision_user ON salary_revision_history(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_revision_org ON salary_revision_history(org_id, user_id);
