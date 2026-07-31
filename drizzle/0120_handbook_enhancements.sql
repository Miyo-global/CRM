ALTER TABLE "handbook_versions" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "handbook_versions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "handbook_versions" ADD COLUMN IF NOT EXISTS "document_url" text;
ALTER TABLE "handbook_versions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'DRAFT';

UPDATE "handbook_versions"
SET "title" = COALESCE(NULLIF(TRIM("title"), ''), "version", 'Handbook')
WHERE "title" IS NULL OR TRIM("title") = '';

UPDATE "handbook_versions"
SET "description" = COALESCE("description", "changelog")
WHERE "description" IS NULL AND "changelog" IS NOT NULL;

UPDATE "handbook_versions"
SET "status" = CASE WHEN "published_at" IS NOT NULL THEN 'PUBLISHED' ELSE 'DRAFT' END
WHERE "status" IS NULL;

ALTER TABLE "handbook_versions" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "handbook_versions" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "handbook_versions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_handbook_org_version" ON "handbook_versions" ("org_id", "version");
