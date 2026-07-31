-- Appraisal workflow + extended PIP (questionnaire implementation)

DO $$ BEGIN CREATE TYPE "appraisal_type" AS ENUM (
  'ANNUAL', 'MID_YEAR', 'QUARTERLY', 'MONTHLY', 'SEMI_ANNUAL',
  'PROBATION_COMPLETION', 'CONFIRMATION', 'ONBOARDING', 'EXIT',
  'PROMOTION', 'ROLE_CHANGE', 'SALARY_REVISION', 'PROJECT_COMPLETION',
  'CRITICAL_INCIDENT', 'GOAL_BASED', 'TARGET_ACHIEVEMENT'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "appraisal_stage" AS ENUM (
  'CYCLE_INITIATION', 'SELF_REVIEW', 'MANAGER_REVIEW', 'CEO_REVIEW',
  'COMPENSATION_REVIEW', 'FINAL_APPROVAL', 'EMPLOYEE_ACK', 'CLOSED'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "appraisal_rating_type" AS ENUM ('NUMERIC', 'TEXT', 'BOTH'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "appraisal_stage_row_status" AS ENUM ('PENDING', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "appraisal_cycle_status" AS ENUM ('OPEN', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_reason" AS ENUM ('POOR_PERFORMANCE', 'BEHAVIORAL', 'POLICY_VIOLATION', 'MISSED_KPIS'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_review_frequency" AS ENUM ('WEEKLY', 'BI_WEEKLY', 'MONTHLY'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_progress_status" AS ENUM ('ON_TRACK', 'AT_RISK', 'NOT_MEETING'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_final_outcome" AS ENUM ('SUCCESS', 'EXTENDED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "pip_improvement_since" AS ENUM ('IMPROVED', 'NO_CHANGE', 'DECLINED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "pip_status" ADD VALUE 'DRAFT'; EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "appraisal_categories" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "rating_type" "appraisal_rating_type" NOT NULL,
  "weight" decimal(6, 4) DEFAULT 0.0833 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "appraisal_cycles" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "type" "appraisal_type" NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "due_date" date,
  "anchor_joining_date" date,
  "status" "appraisal_cycle_status" DEFAULT 'OPEN',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_appraisal_cycles_org_user" ON "appraisal_cycles" ("org_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_appraisal_cycles_period" ON "appraisal_cycles" ("period_start", "period_end");

CREATE TABLE IF NOT EXISTS "appraisals" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "cycle_id" integer REFERENCES "appraisal_cycles"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "reviewer_id" text REFERENCES "users"("id"),
  "current_stage" "appraisal_stage" DEFAULT 'CYCLE_INITIATION' NOT NULL,
  "overall_rating" decimal(4, 2),
  "outcome_notes" text,
  "confidentiality_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_appraisals_org_user" ON "appraisals" ("org_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_appraisals_stage" ON "appraisals" ("org_id", "current_stage");

CREATE TABLE IF NOT EXISTS "appraisal_category_ratings" (
  "id" serial PRIMARY KEY,
  "appraisal_id" integer NOT NULL REFERENCES "appraisals"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "appraisal_categories"("id"),
  "self_score" decimal(4, 2),
  "self_text" text,
  "manager_score" decimal(4, 2),
  "manager_comment" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_appraisal_category_rating" ON "appraisal_category_ratings" ("appraisal_id", "category_id");
CREATE INDEX IF NOT EXISTS "idx_appraisal_cat_ratings_appraisal" ON "appraisal_category_ratings" ("appraisal_id");

CREATE TABLE IF NOT EXISTS "appraisal_stages" (
  "id" serial PRIMARY KEY,
  "appraisal_id" integer NOT NULL REFERENCES "appraisals"("id") ON DELETE CASCADE,
  "stage" "appraisal_stage" NOT NULL,
  "assignee_id" text REFERENCES "users"("id"),
  "status" "appraisal_stage_row_status" DEFAULT 'PENDING' NOT NULL,
  "started_at" timestamp DEFAULT now(),
  "due_at" timestamp,
  "completed_at" timestamp,
  "comment" text
);
CREATE INDEX IF NOT EXISTS "idx_appraisal_stages_appraisal" ON "appraisal_stages" ("appraisal_id");
CREATE INDEX IF NOT EXISTS "idx_appraisal_stages_due" ON "appraisal_stages" ("due_at");

CREATE TABLE IF NOT EXISTS "appraisal_acknowledgements" (
  "id" serial PRIMARY KEY,
  "appraisal_id" integer NOT NULL REFERENCES "appraisals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "acknowledged_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_appraisal_ack" ON "appraisal_acknowledgements" ("appraisal_id");

ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "reason_category" "pip_reason";
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "areas_of_concern" text[];
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "evidence" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "review_frequency" "pip_review_frequency";
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "review_method" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "mentor_id" text REFERENCES "users"("id");
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "hr_rep_id" text REFERENCES "users"("id");
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "expected_improvement" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "consequences_if_not_met" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "acknowledged_at" timestamp;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "acknowledged_comment" text;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "manager_approved_at" timestamp;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "hr_approved_at" timestamp;
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "linked_appraisal_id" integer REFERENCES "appraisals"("id");
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "final_outcome" "pip_final_outcome";
ALTER TABLE "performance_improvement_plans" ADD COLUMN IF NOT EXISTS "initiated_by" text REFERENCES "users"("id");

CREATE INDEX IF NOT EXISTS "idx_pip_org_status" ON "performance_improvement_plans" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "idx_pip_linked_appraisal" ON "performance_improvement_plans" ("linked_appraisal_id");

CREATE TABLE IF NOT EXISTS "pip_goals" (
  "id" serial PRIMARY KEY,
  "pip_id" integer NOT NULL REFERENCES "performance_improvement_plans"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "success_criteria" text NOT NULL,
  "deadline" date NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_pip_goals_pip" ON "pip_goals" ("pip_id");

CREATE TABLE IF NOT EXISTS "pip_check_ins" (
  "id" serial PRIMARY KEY,
  "pip_id" integer NOT NULL REFERENCES "performance_improvement_plans"("id") ON DELETE CASCADE,
  "check_in_date" date NOT NULL,
  "check_in_type" "pip_review_frequency" NOT NULL,
  "period_start" date,
  "period_end" date,
  "overall_status" "pip_progress_status",
  "summary_comments_manager" text,
  "summary_comments_employee" text,
  "manager_rating" integer,
  "manager_feedback" text,
  "improvement_since_last" "pip_improvement_since",
  "employee_self_comments" text,
  "support_required" text,
  "risk_level" "pip_risk_level",
  "escalation_required" boolean DEFAULT false,
  "escalation_notes" text,
  "manager_ack_at" timestamp,
  "employee_ack_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_pip_check_ins_pip" ON "pip_check_ins" ("pip_id");
CREATE INDEX IF NOT EXISTS "idx_pip_check_ins_date" ON "pip_check_ins" ("check_in_date");

CREATE TABLE IF NOT EXISTS "pip_check_in_goal_progress" (
  "id" serial PRIMARY KEY,
  "check_in_id" integer NOT NULL REFERENCES "pip_check_ins"("id") ON DELETE CASCADE,
  "pip_goal_id" integer NOT NULL REFERENCES "pip_goals"("id") ON DELETE CASCADE,
  "progress_status" "pip_progress_status" NOT NULL,
  "percent_complete" integer NOT NULL,
  "work_done" text NOT NULL,
  "blockers" text NOT NULL,
  "next_steps" text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_pip_check_in_goal" ON "pip_check_in_goal_progress" ("check_in_id", "pip_goal_id");

INSERT INTO "appraisal_categories" ("slug", "name", "rating_type", "weight", "sort_order")
VALUES
  ('goals_kpi', 'Goals & KPI Achievement', 'BOTH', 0.0833, 1),
  ('technical_skills', 'Technical / Functional Skills', 'BOTH', 0.0833, 2),
  ('behavioral', 'Behavioral Competencies', 'BOTH', 0.0833, 3),
  ('initiative_ownership', 'Initiative & Ownership', 'BOTH', 0.0833, 4),
  ('productivity_delivery', 'Productivity & Delivery', 'NUMERIC', 0.0833, 5),
  ('problem_solving', 'Problem Solving & Decision Making', 'BOTH', 0.0833, 6),
  ('communication', 'Communication Skills', 'BOTH', 0.0833, 7),
  ('team_collaboration', 'Team Collaboration', 'BOTH', 0.0833, 8),
  ('learning_development', 'Learning & Development', 'TEXT', 0.0833, 9),
  ('leadership', 'Leadership & People Management', 'BOTH', 0.0833, 10),
  ('compliance_discipline', 'Compliance & Discipline', 'NUMERIC', 0.0833, 11),
  ('overall_performance', 'Overall Performance Rating', 'NUMERIC', 0.0833, 12)
ON CONFLICT ("slug") DO NOTHING;
