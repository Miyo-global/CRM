ALTER TABLE performance_improvement_plans
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'FORMAL_PIP',
  ADD COLUMN IF NOT EXISTS sufficient_evidence BOOLEAN,
  ADD COLUMN IF NOT EXISTS performance_improved_counseling BOOLEAN,
  ADD COLUMN IF NOT EXISTS counseling_date DATE,
  ADD COLUMN IF NOT EXISTS counseling_notes TEXT,
  ADD COLUMN IF NOT EXISTS monitoring_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS management_decision TEXT,
  ADD COLUMN IF NOT EXISTS midpoint_assessment_notes TEXT,
  ADD COLUMN IF NOT EXISTS midpoint_on_track BOOLEAN;

CREATE TABLE IF NOT EXISTS pip_documents (
  id SERIAL PRIMARY KEY,
  pip_id INTEGER NOT NULL REFERENCES performance_improvement_plans(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pip_documents_pip ON pip_documents(pip_id);
