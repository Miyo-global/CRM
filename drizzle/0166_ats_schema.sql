CREATE TABLE IF NOT EXISTS "ats_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"application_id" integer,
	"actor_id" text,
	"type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_application_answers" (
	"application_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"value" jsonb,
	CONSTRAINT "ats_application_answers_application_id_question_id_pk" PRIMARY KEY("application_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_application_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'TEXT' NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"knockout" jsonb,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_candidate_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"application_id" integer,
	"author_id" text,
	"body" text NOT NULL,
	"mentions" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_candidate_tag_links" (
	"candidate_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "ats_candidate_tag_links_candidate_id_tag_id_pk" PRIMARY KEY("candidate_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_candidate_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"type" text NOT NULL,
	"text_version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now(),
	"ip" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer,
	"template_id" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text,
	"provider_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_job_members" (
	"job_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'INTERVIEWER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ats_job_members_job_id_user_id_pk" PRIMARY KEY("job_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_refuse_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"email_template_id" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_requisitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"department_id" integer,
	"location" text,
	"employment_type" text DEFAULT 'FULL_TIME',
	"openings" integer DEFAULT 1 NOT NULL,
	"salary_min" numeric,
	"salary_max" numeric,
	"currency" text DEFAULT 'INR',
	"justification" text,
	"hiring_manager_id" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approver_id" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ats_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"job_id" integer,
	"name" text NOT NULL,
	"type" text DEFAULT 'SCREEN' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"email_template_id" text,
	"auto_email" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "stage_id" integer;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "rating" integer;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "rejected_reason_id" integer;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_applications" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_offers" ADD COLUMN IF NOT EXISTS "token_hash" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_offers" ADD COLUMN IF NOT EXISTS "decline_reason" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "candidate_offers" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'NOT_REQUIRED';--> statement-breakpoint
ALTER TABLE IF EXISTS "candidates" ADD COLUMN IF NOT EXISTS "phone_normalized" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "interviews" ADD COLUMN IF NOT EXISTS "ics_uid" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "interviews" ADD COLUMN IF NOT EXISTS "ics_sequence" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE IF EXISTS "interviews" ADD COLUMN IF NOT EXISTS "meeting_url" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "interviews" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Kolkata';--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "closes_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "seo_title" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "seo_description" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "ats_requisition_id" integer;--> statement-breakpoint
ALTER TABLE IF EXISTS "job_postings" ADD COLUMN IF NOT EXISTS "salary_visible" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_activity" ADD CONSTRAINT "ats_activity_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_activity" ADD CONSTRAINT "ats_activity_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_activity" ADD CONSTRAINT "ats_activity_application_id_candidate_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."candidate_applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_activity" ADD CONSTRAINT "ats_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_application_answers" ADD CONSTRAINT "ats_application_answers_application_id_candidate_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."candidate_applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_application_answers" ADD CONSTRAINT "ats_application_answers_question_id_ats_application_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."ats_application_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_application_questions" ADD CONSTRAINT "ats_application_questions_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_notes" ADD CONSTRAINT "ats_candidate_notes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_notes" ADD CONSTRAINT "ats_candidate_notes_application_id_candidate_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."candidate_applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_notes" ADD CONSTRAINT "ats_candidate_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_tag_links" ADD CONSTRAINT "ats_candidate_tag_links_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_tag_links" ADD CONSTRAINT "ats_candidate_tag_links_tag_id_ats_candidate_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."ats_candidate_tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_candidate_tags" ADD CONSTRAINT "ats_candidate_tags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_consents" ADD CONSTRAINT "ats_consents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_email_log" ADD CONSTRAINT "ats_email_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_email_log" ADD CONSTRAINT "ats_email_log_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_job_members" ADD CONSTRAINT "ats_job_members_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_job_members" ADD CONSTRAINT "ats_job_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_refuse_reasons" ADD CONSTRAINT "ats_refuse_reasons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_requisitions" ADD CONSTRAINT "ats_requisitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_requisitions" ADD CONSTRAINT "ats_requisitions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_requisitions" ADD CONSTRAINT "ats_requisitions_hiring_manager_id_users_id_fk" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_requisitions" ADD CONSTRAINT "ats_requisitions_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_requisitions" ADD CONSTRAINT "ats_requisitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_stages" ADD CONSTRAINT "ats_stages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE IF EXISTS "ats_stages" ADD CONSTRAINT "ats_stages_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_activity_candidate" ON "ats_activity" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_activity_application" ON "ats_activity" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_questions_job" ON "ats_application_questions" USING btree ("job_id","sort");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_notes_candidate" ON "ats_candidate_notes" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_ats_tag_org_name" ON "ats_candidate_tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_consents_candidate" ON "ats_consents" USING btree ("candidate_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_email_log_org" ON "ats_email_log" USING btree ("org_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_email_log_candidate" ON "ats_email_log" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_job_members_user" ON "ats_job_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_refuse_reasons_org" ON "ats_refuse_reasons" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_requisitions_org" ON "ats_requisitions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_requisitions_status" ON "ats_requisitions" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_stages_org" ON "ats_stages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ats_stages_job" ON "ats_stages" USING btree ("job_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_job_postings_org_slug" ON "job_postings" USING btree ("org_id","slug");
-- MIYO-0630: full-text search over the candidate's own words. Generated, so
-- it cannot drift from the columns it summarises.
ALTER TABLE IF EXISTS "candidates" ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce("first_name", '') || ' ' ||
      coalesce("last_name", '') || ' ' ||
      coalesce("email", '') || ' ' ||
      coalesce(array_to_string("skills", ' '), '') || ' ' ||
      coalesce("resume_text", '')
    )
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_candidates_search" ON "candidates" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_candidates_phone_normalized" ON "candidates" ("org_id","phone_normalized");
