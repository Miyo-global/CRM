-- Hiring Flow Templates: reusable per-org interview round configurations
CREATE TABLE "hiring_flow_templates" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "description" text,
  "is_default" boolean DEFAULT false,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX "idx_hiring_flow_templates_org" ON "hiring_flow_templates" ("org_id");

-- Rounds within a hiring flow template
CREATE TABLE "hiring_flow_rounds" (
  "id" serial PRIMARY KEY,
  "template_id" integer NOT NULL REFERENCES "hiring_flow_templates"("id") ON DELETE CASCADE,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "round_order" integer NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'INTERVIEW',
  "interviewer_role" text,
  "scorecard_template_id" integer REFERENCES "scorecard_templates"("id"),
  "question_bank_tag" text,
  "sla_days" integer DEFAULT 3,
  "auto_advance_threshold" integer,
  "duration_minutes" integer DEFAULT 60,
  "mode" text DEFAULT 'VIDEO',
  "notes" text
);
CREATE INDEX "idx_hiring_flow_rounds_template" ON "hiring_flow_rounds" ("template_id");

-- Link job postings to hiring flow templates
ALTER TABLE "job_postings"
  ADD COLUMN IF NOT EXISTS "hiring_flow_template_id" integer REFERENCES "hiring_flow_templates"("id"),
  ADD COLUMN IF NOT EXISTS "hiring_flow_config" jsonb;

-- Track granular pipeline stage per application
ALTER TABLE "candidate_applications"
  ADD COLUMN IF NOT EXISTS "pipeline_stage" text DEFAULT 'APPLIED',
  ADD COLUMN IF NOT EXISTS "current_round_index" integer,
  ADD COLUMN IF NOT EXISTS "stage_history" jsonb DEFAULT '[]';

-- Link interviews to their application and round
ALTER TABLE "interviews"
  ADD COLUMN IF NOT EXISTS "application_id" integer REFERENCES "candidate_applications"("id"),
  ADD COLUMN IF NOT EXISTS "round_index" integer,
  ADD COLUMN IF NOT EXISTS "round_label" text;
