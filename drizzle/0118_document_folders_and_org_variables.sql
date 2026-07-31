-- Document library folders (persisted per org)
CREATE TABLE IF NOT EXISTS "document_folders" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_folders_org_name"
  ON "document_folders" ("org_id", lower("name"));

-- Org-level template variable defaults (e.g. Support_Email -> support@company.com)
CREATE TABLE IF NOT EXISTS "org_document_variables" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "default_value" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_org_document_variables_org_slug"
  ON "org_document_variables" ("org_id", lower("slug"));

-- Active document templates: unique title per type per org
CREATE UNIQUE INDEX IF NOT EXISTS "idx_doc_templates_org_type_title_active"
  ON "document_templates" ("org_id", "type", lower("title"))
  WHERE "is_active" = true;
