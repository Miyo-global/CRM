-- The branch:* permissions (create/read/update/manage_targets) belonged to the
-- removed sales module and left the catalogue, but roles may still store the
-- names, so the permission matrix would keep a "Branches" group. Snapshot the
-- stored arrays, then drop the branch:* names. Safe to run twice. Restore by
-- hand from roles_permissions_backup_0192 if ever needed.

CREATE TABLE IF NOT EXISTS "roles_permissions_backup_0192" AS
SELECT "id", "org_id", "slug", "permissions", now() AS "backed_up_at"
FROM "roles"
WHERE "permissions" IS NOT NULL
  AND jsonb_typeof("permissions") = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text("permissions") AS p(name) WHERE p.name LIKE 'branch:%'
  );--> statement-breakpoint

UPDATE "roles"
SET "permissions" = COALESCE(
      (SELECT jsonb_agg(p.name ORDER BY p.ord)
       FROM jsonb_array_elements_text("permissions") WITH ORDINALITY AS p(name, ord)
       WHERE p.name NOT LIKE 'branch:%'),
      '[]'::jsonb
    ),
    "updated_at" = now()
WHERE "permissions" IS NOT NULL
  AND jsonb_typeof("permissions") = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text("permissions") AS p(name) WHERE p.name LIKE 'branch:%'
  );
