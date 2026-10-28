-- Appraisal categories per org (P3-appraisal-categories-not-configured).
-- The table was global. A nullable org_id lets each org manage its own
-- categories; existing rows keep org_id NULL and stay visible to every org as
-- global defaults. Prod has 0 rows; nothing is rewritten or deleted.
--
-- The global UNIQUE(slug) would stop two orgs using the same slug, so it is
-- replaced by one unique index per scope. Idempotent: the column, constraint
-- drop and indexes are all guarded.
ALTER TABLE "appraisal_categories"
  ADD COLUMN IF NOT EXISTS "org_id" text REFERENCES "organizations"("id");--> statement-breakpoint

-- The slug constraint is named _slug_key (0104's inline UNIQUE) or
-- _slug_unique (drizzle push); drop whichever single-column unique exists.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = '"appraisal_categories"'::regclass
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 1
      AND att.attname = 'slug'
  LOOP
    EXECUTE format('ALTER TABLE "appraisal_categories" DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_appraisal_categories_global_slug"
  ON "appraisal_categories" ("slug") WHERE "org_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_appraisal_categories_org_slug"
  ON "appraisal_categories" ("org_id", "slug") WHERE "org_id" IS NOT NULL;
