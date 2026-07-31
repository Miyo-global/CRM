-- QA phase 2: additive schema (candidate management fields, support ticket SLA tracking, payroll schedules)

-- 1. candidates: Candidate Management module fields
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "alternate_phone" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "date_of_birth" date;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "preferred_location" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "requisition_id" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "employment_type" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "application_date" date;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "relevant_experience_months" integer;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "current_employment_status" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "notice_period_days" integer;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "available_from" date;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "current_ctc" numeric;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "expected_ctc" numeric;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "salary_currency" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "cover_letter_url" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "work_authorization" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "willing_to_relocate" boolean;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "preferred_work_mode" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "referral_name" text;

-- 2. crm_support_tickets: response-rate + SLA tracking
ALTER TABLE "crm_support_tickets" ADD COLUMN IF NOT EXISTS "first_response_at" timestamp;
ALTER TABLE "crm_support_tickets" ADD COLUMN IF NOT EXISTS "sla_due_at" timestamp;

-- 3. payroll_schedules: one schedule per org
CREATE TABLE IF NOT EXISTS "payroll_schedules" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "frequency" text NOT NULL DEFAULT 'MONTHLY',
  "day_of_month" integer DEFAULT 1,
  "is_enabled" boolean DEFAULT false,
  "auto_approve" boolean DEFAULT false,
  "last_run_period" text,
  "last_run_at" timestamp,
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_payroll_schedules_org" ON "payroll_schedules" ("org_id");
