-- KB-0023: move the legacy project wiki (public.pages) into kb_pages (D3).
--
-- Idempotent through uniq_kb_pages_external_ref: every migrated row carries
-- external_source='crm_pages' and external_id=pages.id, so a second run inserts
-- nothing. The old pages table is left in place and dropped in a later
-- migration once the move has been verified in production.
--
-- is_public on a legacy page meant "visible to the project", not "on the
-- internet", so it maps to visibility='org' and never to 'public'.
-- content_text stays NULL here and is filled by KB-0033, which needs the
-- Plate conversion that only exists in app code.

-- One project space per project, named from the project so the tree reads well.
INSERT INTO "kb_spaces" ("org_id", "name", "slug", "type", "default_visibility", "created_at", "updated_at")
SELECT p."org_id", p."name", 'project-' || p."id", 'project', 'org', now(), now()
FROM "projects" p
WHERE EXISTS (SELECT 1 FROM "pages" g WHERE g."project_id" = p."id")
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "kb_pages" (
  "org_id", "space_id", "project_id", "title", "icon", "cover_image", "content",
  "visibility", "status", "created_by_id", "created_at", "updated_at",
  "external_source", "external_id"
)
SELECT
  g."org_id",
  s."id",
  g."project_id",
  g."title",
  g."icon",
  g."cover_image",
  g."content",
  'org',
  'published',
  g."created_by",
  COALESCE(g."created_at", now()),
  COALESCE(g."updated_at", now()),
  'crm_pages',
  g."id"::text
FROM "pages" g
LEFT JOIN "kb_spaces" s
  ON s."org_id" = g."org_id" AND s."slug" = 'project-' || g."project_id"
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Parents are remapped after the fact: the child may have been inserted before
-- its parent, so the old ids are translated through the external ref.
UPDATE "kb_pages" child
SET "parent_page_id" = parent."id"
FROM "pages" legacy
JOIN "kb_pages" parent
  ON parent."external_source" = 'crm_pages'
 AND parent."external_id" = legacy."parent_page_id"::text
 AND parent."org_id" = legacy."org_id"
WHERE child."external_source" = 'crm_pages'
  AND child."external_id" = legacy."id"::text
  AND child."org_id" = legacy."org_id"
  AND legacy."parent_page_id" IS NOT NULL
  AND child."parent_page_id" IS DISTINCT FROM parent."id";
