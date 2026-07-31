-- Career Ladder Module: employee profiles, evaluations, promotions, audit logs
-- APPLY TO TEST DB ONLY — prod deferred

CREATE TYPE "career_readiness_status" AS ENUM ('NOT_READY', 'DEVELOPING', 'READY_SOON', 'RECOMMENDED');
CREATE TYPE "career_promotion_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "employee_career_profiles" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "ladder_id" integer REFERENCES "career_ladders"("id"),
  "current_level" integer DEFAULT 1,
  "assigned_by" text REFERENCES "users"("id"),
  "assigned_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_career_profiles_org" ON "employee_career_profiles"("org_id");
CREATE INDEX "idx_career_profiles_user" ON "employee_career_profiles"("user_id");
CREATE UNIQUE INDEX "uq_career_profiles_org_user" ON "employee_career_profiles"("org_id", "user_id");

CREATE TABLE "career_evaluations" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "employee_user_id" text NOT NULL REFERENCES "users"("id"),
  "evaluator_user_id" text NOT NULL REFERENCES "users"("id"),
  "ladder_id" integer REFERENCES "career_ladders"("id"),
  "level" integer,
  "readiness_status" "career_readiness_status" NOT NULL DEFAULT 'NOT_READY',
  "strengths" text,
  "areas_to_grow" text,
  "notes" text,
  "evaluated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_career_evaluations_org" ON "career_evaluations"("org_id");
CREATE INDEX "idx_career_evaluations_employee" ON "career_evaluations"("employee_user_id");

CREATE TABLE "career_promotion_recommendations" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "employee_user_id" text NOT NULL REFERENCES "users"("id"),
  "recommended_by" text NOT NULL REFERENCES "users"("id"),
  "ladder_id" integer REFERENCES "career_ladders"("id"),
  "from_level" integer,
  "to_level" integer NOT NULL,
  "status" "career_promotion_status" NOT NULL DEFAULT 'PENDING',
  "reason" text,
  "reviewed_by" text REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "review_notes" text,
  "effective_date" date,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_career_promos_org" ON "career_promotion_recommendations"("org_id");
CREATE INDEX "idx_career_promos_employee" ON "career_promotion_recommendations"("employee_user_id");

CREATE TABLE "career_promotion_history" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "employee_user_id" text NOT NULL REFERENCES "users"("id"),
  "ladder_id" integer REFERENCES "career_ladders"("id"),
  "from_level" integer,
  "to_level" integer NOT NULL,
  "promoted_by" text REFERENCES "users"("id"),
  "recommendation_id" integer REFERENCES "career_promotion_recommendations"("id"),
  "effective_date" date,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_career_history_org" ON "career_promotion_history"("org_id");
CREATE INDEX "idx_career_history_employee" ON "career_promotion_history"("employee_user_id");

CREATE TABLE "career_audit_logs" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "actor_user_id" text REFERENCES "users"("id"),
  "target_user_id" text REFERENCES "users"("id"),
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" integer,
  "changes" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_career_audit_org" ON "career_audit_logs"("org_id");
CREATE INDEX "idx_career_audit_target" ON "career_audit_logs"("target_user_id");
