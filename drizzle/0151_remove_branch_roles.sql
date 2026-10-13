-- BRANCH_MANAGER and BRANCH_HR roles were removed from the app.
-- Existing holders become HR (org-wide HR access); branch membership
-- (users.branch_id) is kept as data.
UPDATE "organization_members" SET "role" = 'HR' WHERE "role" IN ('BRANCH_MANAGER', 'BRANCH_HR');
--> statement-breakpoint
UPDATE "users" SET "role" = 'HR' WHERE "role" IN ('BRANCH_MANAGER', 'BRANCH_HR');
--> statement-breakpoint
UPDATE "invitations" SET "role" = 'HR' WHERE "role" IN ('BRANCH_MANAGER', 'BRANCH_HR');
--> statement-breakpoint
DELETE FROM "role_permissions" WHERE "role" IN ('BRANCH_MANAGER', 'BRANCH_HR');
--> statement-breakpoint
DELETE FROM "roles" WHERE "is_system" = true AND "slug" IN ('BRANCH_MANAGER', 'BRANCH_HR');
