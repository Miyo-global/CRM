-- R3-PRJ-08 follow-up: one leave balance row per (org, user, leave type, year).
-- Racing seeders (ensureUserBalances / initializeLeaveBalances) left a second,
-- untouched row next to the real one. The app already reads and deducts from
-- the oldest row (lowest id), so that row is kept; every newer duplicate is
-- copied to leave_balances_dupes_backup_0193 and then deleted. Idempotent:
-- a second run finds no duplicates and the index already exists.
CREATE TABLE IF NOT EXISTS "leave_balances_dupes_backup_0193" (
  LIKE "leave_balances",
  "backed_up_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- One statement, so the lock, backup, delete and index are atomic under any
-- runner; the lock stops a seeder inserting a new duplicate mid-way.
DO $$
BEGIN
  LOCK TABLE "leave_balances" IN SHARE ROW EXCLUSIVE MODE;

  -- PARTITION BY groups NULL leave_type_id rows together, as the app's read did.
  CREATE TEMP TABLE "leave_balances_dupes_0193" ON COMMIT DROP AS
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "org_id", "user_id", "leave_type_id", "year" ORDER BY "id"
    ) AS rn
    FROM "leave_balances"
  ) ranked
  WHERE ranked.rn > 1;

  INSERT INTO "leave_balances_dupes_backup_0193" ("id", "org_id", "user_id", "leave_type_id", "balance", "year")
  SELECT lb."id", lb."org_id", lb."user_id", lb."leave_type_id", lb."balance", lb."year"
  FROM "leave_balances" lb
  JOIN "leave_balances_dupes_0193" d ON d."id" = lb."id"
  WHERE NOT EXISTS (SELECT 1 FROM "leave_balances_dupes_backup_0193" b WHERE b."id" = lb."id");

  DELETE FROM "leave_balances" lb
  USING "leave_balances_dupes_0193" d
  WHERE d."id" = lb."id";

  DROP TABLE "leave_balances_dupes_0193";

  CREATE UNIQUE INDEX IF NOT EXISTS "uq_leave_balances_org_user_type_year"
    ON "leave_balances" ("org_id", "user_id", "leave_type_id", "year");
END $$;
