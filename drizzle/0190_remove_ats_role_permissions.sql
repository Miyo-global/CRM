-- R3-INV-01: the ATS ships off and its permissions left the catalogue, but
-- roles still stored "ats:*" names, so the permission matrix kept an
-- "ATS:CANDIDATES" group. Snapshot the stored arrays, then drop the ats:*
-- names. Safe to run twice. Restore by hand from roles_permissions_backup_0190
-- if the ATS is switched on later (system role defaults come back on their own).

CREATE TABLE IF NOT EXISTS "roles_permissions_backup_0190" AS
SELECT "id", "org_id", "slug", "permissions", now() AS "backed_up_at"
FROM "roles"
WHERE "permissions" IS NOT NULL
  AND jsonb_typeof("permissions") = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text("permissions") AS p(name) WHERE p.name LIKE 'ats:%'
  );--> statement-breakpoint

UPDATE "roles"
SET "permissions" = COALESCE(
      (SELECT jsonb_agg(p.name ORDER BY p.ord)
       FROM jsonb_array_elements_text("permissions") WITH ORDINALITY AS p(name, ord)
       WHERE p.name NOT LIKE 'ats:%'),
      '[]'::jsonb
    ),
    "updated_at" = now()
WHERE "permissions" IS NOT NULL
  AND jsonb_typeof("permissions") = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text("permissions") AS p(name) WHERE p.name LIKE 'ats:%'
  );
