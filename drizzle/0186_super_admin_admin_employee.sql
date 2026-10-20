-- QA-ROLE-01, QA-ROLE-02, QA-AUTH-02: Super Admin, Admin, HR and Employee.
--
-- The owner held plain ADMIN and nobody held CEO, and six job titles
-- (Engineering, Design, Sales, Customer Support, Video Editor, Digital
-- Marketing) were modelled as access levels. This migration:
--   1. snapshots every member's role and designation, and the roles table, so
--      the change can be reverted by hand;
--   2. copies a job-title role into the designation where none is set, so the
--      title survives as data;
--   3. moves every job-title holder (and pending invitation) to EMPLOYEE;
--   4. makes tarun@miyoglobal.com the Super Admin (CEO) of each org he belongs
--      to, unless that org already has one;
--   5. makes ADMIN and EMPLOYEE visible system roles on /settings/roles,
--      renames CEO to Super Admin and drops the retired job-title rows;
--   6. defaults new members to EMPLOYEE.
-- Every step is safe to run twice. HR, ADMIN, RECRUITER and custom roles are
-- left as they are.

CREATE TABLE IF NOT EXISTS "role_migration_backup_0186" (
  "user_id" text NOT NULL,
  "org_id" text,
  "users_role" text,
  "member_role" text,
  "designation" text,
  "backed_up_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

INSERT INTO "role_migration_backup_0186" ("user_id", "org_id", "users_role", "member_role", "designation")
SELECT u."id", om."org_id", u."role", om."role", u."designation"
FROM "users" u
LEFT JOIN "organization_members" om ON om."user_id" = u."id"
WHERE NOT EXISTS (SELECT 1 FROM "role_migration_backup_0186");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "roles_backup_0186" AS SELECT * FROM "roles";--> statement-breakpoint

UPDATE "users"
SET "designation" = CASE "role"
    WHEN 'ENGINEERING' THEN 'Engineering'
    WHEN 'DESIGN' THEN 'Design'
    WHEN 'SALES' THEN 'Sales'
    WHEN 'CUSTOMER_SUPPORT' THEN 'Customer Support'
    WHEN 'VIDEO_EDITOR' THEN 'Video Editor'
    WHEN 'DIGITAL_MARKETING' THEN 'Digital Marketing'
  END,
  "updated_at" = now()
WHERE "role" IN ('ENGINEERING', 'DESIGN', 'SALES', 'CUSTOMER_SUPPORT', 'VIDEO_EDITOR', 'DIGITAL_MARKETING')
  AND ("designation" IS NULL OR btrim("designation") = '');--> statement-breakpoint

UPDATE "organization_members" SET "role" = 'EMPLOYEE'
WHERE "role" IN ('ENGINEERING', 'DESIGN', 'SALES', 'CUSTOMER_SUPPORT', 'VIDEO_EDITOR', 'DIGITAL_MARKETING');--> statement-breakpoint

UPDATE "users" SET "role" = 'EMPLOYEE', "updated_at" = now()
WHERE "role" IN ('ENGINEERING', 'DESIGN', 'SALES', 'CUSTOMER_SUPPORT', 'VIDEO_EDITOR', 'DIGITAL_MARKETING');--> statement-breakpoint

UPDATE "invitations" SET "role" = 'EMPLOYEE'
WHERE "accepted_at" IS NULL
  AND "role" IN ('ENGINEERING', 'DESIGN', 'SALES', 'CUSTOMER_SUPPORT', 'VIDEO_EDITOR', 'DIGITAL_MARKETING');--> statement-breakpoint

UPDATE "organization_members" om SET "role" = 'CEO'
FROM "users" u
WHERE u."id" = om."user_id"
  AND lower(u."email") = 'tarun@miyoglobal.com'
  AND om."role" <> 'CEO'
  AND NOT EXISTS (
    SELECT 1 FROM "organization_members" other
    WHERE other."org_id" = om."org_id" AND other."role" = 'CEO' AND other."user_id" <> om."user_id"
  );--> statement-breakpoint

UPDATE "users" u SET "role" = 'CEO', "updated_at" = now()
WHERE lower(u."email") = 'tarun@miyoglobal.com'
  AND u."role" <> 'CEO'
  AND EXISTS (SELECT 1 FROM "organization_members" om WHERE om."user_id" = u."id" AND om."role" = 'CEO');--> statement-breakpoint

INSERT INTO "roles" ("name", "slug", "org_id", "is_system", "permissions")
SELECT v."name", v."slug", o."id", true, '[]'::jsonb
FROM "organizations" o
CROSS JOIN (VALUES ('Super Admin', 'CEO'), ('Admin', 'ADMIN'), ('HR', 'HR'), ('Employee', 'EMPLOYEE')) AS v("name", "slug")
ON CONFLICT ("slug", "org_id") DO UPDATE SET "is_system" = true;--> statement-breakpoint

UPDATE "roles" SET "name" = 'Super Admin', "updated_at" = now()
WHERE "slug" = 'CEO' AND "name" <> 'Super Admin';--> statement-breakpoint

DELETE FROM "roles"
WHERE "is_system" = true
  AND "slug" IN ('ENGINEERING', 'DESIGN', 'SALES', 'CUSTOMER_SUPPORT', 'VIDEO_EDITOR', 'DIGITAL_MARKETING');--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
