ALTER TABLE "one_on_one_meetings"
  ALTER COLUMN "scheduled_at" TYPE timestamptz USING "scheduled_at" AT TIME ZONE 'UTC';
