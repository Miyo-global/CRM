-- R3-ADM-07: a submitted termination can be cancelled, and an employee has at
-- most one open termination (draft, pending approval, approved, email sent).
-- Additive only. The unique index is created only when existing rows already
-- satisfy it, so this never fails on old duplicates; the API enforces the
-- same rule either way (lib/hr/termination-guards.ts).
ALTER TYPE "public"."termination_status" ADD VALUE IF NOT EXISTS 'CANCELLED';--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "terminations"
    WHERE "status" IN ('DRAFT', 'PENDING_CEO', 'APPROVED', 'SENT')
    GROUP BY "org_id", "user_id"
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_terminations_one_open_per_user"
      ON "terminations" ("org_id", "user_id")
      WHERE "status" IN ('DRAFT', 'PENDING_CEO', 'APPROVED', 'SENT');
  ELSE
    RAISE NOTICE 'uq_terminations_one_open_per_user skipped: duplicate open terminations exist';
  END IF;
END $$;
