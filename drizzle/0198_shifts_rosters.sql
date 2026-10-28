-- INFO-shifts-rosters-not-in-build: a minimal shifts module. A shift is a
-- named working window on given weekdays; an assignment puts one employee on a
-- shift from a date (open-ended when effective_to is NULL). Display only:
-- attendance calculations do not read these tables. New tables, idempotent.
CREATE TABLE IF NOT EXISTS "shifts" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  -- 0 = Sunday … 6 = Saturday.
  "days_of_week" integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  -- Archived shifts keep their history but take no new assignments.
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "chk_shifts_days_of_week" CHECK ("days_of_week" <@ '{0,1,2,3,4,5,6}'::integer[])
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_shifts_org" ON "shifts" ("org_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "shift_assignments" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shift_id" integer NOT NULL REFERENCES "shifts"("id") ON DELETE CASCADE,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "chk_shift_assignments_range" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_shift_assignments_org_user" ON "shift_assignments" ("org_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_shift_assignments_shift" ON "shift_assignments" ("shift_id");
