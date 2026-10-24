-- A timesheet row is one entry: a ticket's time for a day (ticket_id set) or
-- the free-form daily work log (ticket_id NULL). 0128's (org, user, date)
-- constraint allowed only one of those per day, so logging a second ticket the
-- same day returned 409. Now: one entry per ticket per day, and one free-form
-- log per day. Additive first, then the old constraint goes; existing rows
-- already satisfy the narrower old rule, so both indexes build.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_timesheets_org_user_date_ticket"
  ON "timesheets" ("org_id", "user_id", "date", "ticket_id")
  WHERE "ticket_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_timesheets_org_user_date_daily_log"
  ON "timesheets" ("org_id", "user_id", "date")
  WHERE "ticket_id" IS NULL;--> statement-breakpoint
ALTER TABLE "timesheets" DROP CONSTRAINT IF EXISTS "timesheets_org_user_date_unique";
