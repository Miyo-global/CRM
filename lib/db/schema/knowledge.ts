/**
 * KB-0010 onward: the Knowledge Base tables.
 *
 * Ported from Streamline SB/db/schema/kb/*.ts. Two deliberate differences:
 * every actor column is `user_id text REFERENCES users(id)` (the CRM has one
 * org per user, so Streamline's `*_membership_id` pairs have nothing to point
 * at), and every timestamp is timestamptz. The `(org_id, id)` uniques and the
 * composite org foreign keys are kept, since they are what stops a row in one
 * org pointing at a row in another.
 */
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organizations, users } from "./auth";
import { projects } from "./projects";

export const kbAudienceEnum = pgEnum("kb_audience", ["internal", "public", "mixed"]);
export const kbSpaceRoleEnum = pgEnum("kb_space_role", [
  "viewer",
  "commenter",
  "editor",
  "publisher",
  "admin",
]);

export type KbPageContent = Record<string, unknown> | Record<string, unknown>[];
export type KbSpaceType = "private" | "team" | "company" | "module" | "support" | "project";
export type KbVisibility = "private" | "org" | "public";
export type KbPageStatus = "draft" | "in_review" | "published" | "archived";
export type KbTrustState = "unverified" | "verified" | "verification_expired";
export type KbContentType =
  | "note"
  | "sop"
  | "policy"
  | "support_article"
  | "troubleshooting"
  | "decision_record"
  | "meeting_notes"
  | "runbook"
  | "project_brief"
  | "playbook";

/** Generated column; read-only from the app's side. */
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const kbSpaces = pgTable(
  "kb_spaces",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    audience: kbAudienceEnum("audience").default("internal").notNull(),
    icon: text("icon"),
    color: text("color"),
    branding: jsonb("branding").$type<Record<string, unknown>>(),
    type: text("type").notNull().default("team").$type<KbSpaceType>(),
    defaultVisibility: text("default_visibility").notNull().default("org").$type<KbVisibility>(),
    owningTeamId: text("owning_team_id"),
    isPublicHelpCenter: boolean("is_public_help_center").default(false).notNull(),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("uniq_kb_spaces_org_id").on(table.orgId, table.id),
    uniqueIndex("uniq_kb_spaces_org_slug")
      .on(table.orgId, table.slug)
      .where(sql`deleted_at IS NULL`),
    index("idx_kb_spaces_org_live").on(table.orgId).where(sql`deleted_at IS NULL`),
    index("idx_kb_spaces_org_created_by").on(table.orgId, table.createdById),
  ],
);

export const kbSpaceMembers = pgTable(
  "kb_space_members",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    spaceId: integer("space_id").notNull(),
    /** A person, or null when the row grants by role or team. */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    role: text("role"),
    team: text("team"),
    spaceRole: kbSpaceRoleEnum("space_role").default("viewer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_space_members_org_id").on(table.orgId, table.id),
    uniqueIndex("uniq_kb_space_members_org_space_user")
      .on(table.orgId, table.spaceId, table.userId)
      .where(sql`user_id IS NOT NULL`),
    uniqueIndex("uniq_kb_space_members_org_space_role")
      .on(table.orgId, table.spaceId, table.role)
      .where(sql`role IS NOT NULL`),
    index("idx_kb_space_members_space").on(table.spaceId),
    index("idx_kb_space_members_org_user").on(table.orgId, table.userId),
    index("idx_kb_space_members_org_role").on(table.orgId, table.role),
    foreignKey({
      columns: [table.orgId, table.spaceId],
      foreignColumns: [kbSpaces.orgId, kbSpaces.id],
      name: "fk_kb_space_members_org_space",
    }).onDelete("cascade"),
  ],
);

/** One counter per org, bumped when space access changes (KB-0032). */
export const kbSpaceAclVersions = pgTable("kb_space_acl_versions", {
  orgId: text("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  // number mode: the counter is read and compared in app code, and the ES2017
  // target this repo compiles to has no BigInt literals.
  revision: bigint("revision", { mode: "number" }).notNull().default(1),
});

export const kbPages = pgTable(
  "kb_pages",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    spaceId: integer("space_id"),
    parentPageId: integer("parent_page_id"),
    title: text("title").notNull().default(""),
    icon: text("icon"),
    coverImage: text("cover_image"),
    /** Plate JSON. */
    content: jsonb("content").$type<KbPageContent>(),
    contentText: text("content_text"),
    fts: tsvector("fts").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(content_text, '')), 'B')`,
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    isLocked: boolean("is_locked").default(false).notNull(),
    visibility: text("visibility").notNull().default("org").$type<KbVisibility>(),
    status: text("status").notNull().default("draft").$type<KbPageStatus>(),
    contentType: text("content_type").notNull().default("note").$type<KbContentType>(),
    trustState: text("trust_state").notNull().default("unverified").$type<KbTrustState>(),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    lastEditedById: text("last_edited_by_id").references(() => users.id, { onDelete: "set null" }),
    deletedById: text("deleted_by_id").references(() => users.id, { onDelete: "set null" }),
    verifiedById: text("verified_by_id").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedUntil: timestamp("verified_until", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    reviewIntervalDays: integer("review_interval_days"),
    aclRevision: integer("acl_revision").notNull().default(1),
    aclRevisionChangedAt: timestamp("acl_revision_changed_at", { withTimezone: true }),
    contentRevision: integer("content_revision").notNull().default(1),
    /** Shown once on creation; only the hash is kept (KB-0045). */
    publicToken: text("public_token"),
    publicTokenHash: text("public_token_hash"),
    publicTokenRevision: integer("public_token_revision").notNull().default(1),
    publicSlug: text("public_slug"),
    slug: text("slug"),
    excerpt: text("excerpt"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** No FK until kb_categories lands in KB-0022. */
    categoryId: integer("category_id"),
    sourceTicketId: integer("source_ticket_id"),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    views: integer("views").default(0),
    helpfulCount: integer("helpful_count").default(0),
    notHelpfulCount: integer("not_helpful_count").default(0),
    legalHold: boolean("legal_hold").notNull().default(false),
    legalHoldReason: text("legal_hold_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_pages_org_id").on(table.orgId, table.id),
    index("idx_kb_pages_fts").using("gin", table.fts),
    index("idx_kb_pages_org_parent_sort")
      .on(table.orgId, table.parentPageId, table.sortOrder)
      .where(sql`deleted_at IS NULL`),
    index("idx_kb_pages_org_updated")
      .on(table.orgId, table.updatedAt)
      .where(sql`deleted_at IS NULL`),
    index("idx_kb_pages_org_status")
      .on(table.orgId, table.status)
      .where(sql`deleted_at IS NULL`),
    index("idx_kb_pages_org_next_review")
      .on(table.orgId, table.nextReviewAt)
      .where(sql`deleted_at IS NULL AND next_review_at IS NOT NULL`),
    index("idx_kb_pages_org_deleted").on(table.orgId, table.deletedAt),
    index("idx_kb_pages_parent").on(table.parentPageId),
    index("idx_kb_pages_project_id").on(table.projectId),
    uniqueIndex("uniq_kb_pages_public_token_hash")
      .on(table.publicTokenHash)
      .where(sql`public_token_hash IS NOT NULL`),
    uniqueIndex("uniq_kb_pages_org_public_slug")
      .on(table.orgId, table.publicSlug)
      .where(sql`public_slug IS NOT NULL`),
    uniqueIndex("uniq_kb_pages_org_slug_ref")
      .on(table.orgId, table.slug)
      .where(sql`slug IS NOT NULL`),
    uniqueIndex("uniq_kb_pages_external_ref")
      .on(table.orgId, table.externalSource, table.externalId)
      .where(sql`external_id IS NOT NULL`),
    uniqueIndex("uniq_kb_pages_org_source_ticket")
      .on(table.orgId, table.sourceTicketId)
      .where(sql`source_ticket_id IS NOT NULL`),
    check("kb_pages_status_check", sql`status IN ('draft', 'in_review', 'published', 'archived')`),
    check(
      "kb_pages_trust_state_check",
      sql`trust_state IN ('unverified', 'verified', 'verification_expired')`,
    ),
    check("kb_pages_visibility_check", sql`visibility IN ('private', 'org', 'public')`),
    check(
      "chk_kb_pages_external_ref_paired",
      sql`(external_id IS NULL) = (external_source IS NULL)`,
    ),
    foreignKey({
      columns: [table.orgId, table.spaceId],
      foreignColumns: [kbSpaces.orgId, kbSpaces.id],
      name: "fk_kb_pages_org_space",
    }),
    foreignKey({
      columns: [table.orgId, table.parentPageId],
      foreignColumns: [table.orgId, table.id],
      name: "fk_kb_pages_org_parent",
    }),
  ],
);

export const kbPageFavorites = pgTable(
  "kb_page_favorites",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_favorites_org_id").on(table.orgId, table.id),
    unique("uniq_kb_page_favorites_page_user").on(table.pageId, table.userId),
    index("idx_kb_page_favorites_org_user_sort").on(
      table.orgId,
      table.userId,
      table.sortOrder,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_favorites_org_page",
    }).onDelete("cascade"),
  ],
);

/** One row per page per reader, moved forward on each visit. */
export const kbPageVisits = pgTable(
  "kb_page_visits",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_visits_org_id").on(table.orgId, table.id),
    unique("uniq_kb_page_visits_page_user").on(table.pageId, table.userId),
    index("idx_kb_page_visits_org_user_visited").on(table.orgId, table.userId, table.visitedAt),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_visits_org_page",
    }).onDelete("cascade"),
  ],
);

/** Re-synced from page content on every save (KB-0041). */
export const kbPageLinks = pgTable(
  "kb_page_links",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    sourcePageId: integer("source_page_id").notNull(),
    targetPageId: integer("target_page_id"),
    targetType: text("target_type").notNull().default("page"),
    targetId: text("target_id"),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_links_org_id").on(table.orgId, table.id),
    unique("uniq_kb_page_links_source_target").on(table.sourcePageId, table.targetPageId),
    uniqueIndex("uniq_kb_page_links_org_source_record")
      .on(table.orgId, table.sourcePageId, table.targetType, table.targetId)
      .where(sql`target_id IS NOT NULL`),
    index("idx_kb_page_links_org_target").on(table.orgId, table.targetPageId),
    foreignKey({
      columns: [table.orgId, table.sourcePageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_links_org_source",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orgId, table.targetPageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_links_org_target",
    }).onDelete("cascade"),
  ],
);

/**
 * Append-only: migration 0174 adds a trigger that refuses a direct UPDATE of
 * the recorded content and a direct DELETE. Only INSERT from app code.
 */
export const kbPageVersions = pgTable(
  "kb_page_versions",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull().default(""),
    content: jsonb("content").$type<KbPageContent>(),
    contentText: text("content_text"),
    excerpt: text("excerpt"),
    changeSummary: text("change_summary"),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_versions_org_id").on(table.orgId, table.id),
    unique("uniq_kb_page_versions_page_version").on(table.pageId, table.versionNumber),
    index("idx_kb_page_versions_org_page").on(table.orgId, table.pageId),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_versions_org_page",
    }).onDelete("cascade"),
  ],
);

export const kbPageComments = pgTable(
  "kb_page_comments",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    parentId: integer("parent_id"),
    content: text("content").notNull(),
    /** Where in the document the thread hangs (KB-0040). */
    anchorBlockIndex: integer("anchor_block_index"),
    anchorQuote: text("anchor_quote"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_comments_org_id").on(table.orgId, table.id),
    index("idx_kb_page_comments_org_page").on(table.orgId, table.pageId),
    index("idx_kb_page_comments_parent").on(table.parentId),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_comments_org_page",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orgId, table.parentId],
      foreignColumns: [table.orgId, table.id],
      name: "fk_kb_page_comments_org_parent",
    }).onDelete("cascade"),
  ],
);

export const kbPageTemplates = pgTable(
  "kb_page_templates",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    description: text("description"),
    content: jsonb("content").$type<KbPageContent>(),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_templates_org_id").on(table.orgId, table.id),
    unique("uniq_kb_page_templates_org_name").on(table.orgId, table.name),
  ],
);

export const KB_PAGE_GRANT_ACCESS = ["view", "comment", "edit", "manage"] as const;
export type KbPageGrantAccess = (typeof KB_PAGE_GRANT_ACCESS)[number];

export const KB_RESTRICTION_LEVELS = ["view", "edit"] as const;
export type KbRestrictionLevel = (typeof KB_RESTRICTION_LEVELS)[number];

/** A grant is revoked, never deleted, so the live uniques are partial. */
export const kbPageGrants = pgTable(
  "kb_page_grants",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    role: text("role"),
    access: text("access").$type<KbPageGrantAccess>().default("view").notNull(),
    grantedById: text("granted_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("uniq_kb_page_grants_org_id").on(table.orgId, table.id),
    uniqueIndex("uniq_kb_page_grants_live_user")
      .on(table.orgId, table.pageId, table.userId)
      .where(sql`revoked_at IS NULL AND user_id IS NOT NULL`),
    uniqueIndex("uniq_kb_page_grants_live_role")
      .on(table.orgId, table.pageId, table.role)
      .where(sql`revoked_at IS NULL AND role IS NOT NULL`),
    index("idx_kb_page_grants_org_user_live")
      .on(table.orgId, table.userId, table.pageId)
      .where(sql`revoked_at IS NULL`),
    index("idx_kb_page_grants_org_role_live")
      .on(table.orgId, table.role, table.pageId)
      .where(sql`revoked_at IS NULL`),
    index("idx_kb_page_grants_org_page_live")
      .on(table.orgId, table.pageId)
      .where(sql`revoked_at IS NULL`),
    index("idx_kb_page_grants_org_granted_by").on(table.orgId, table.grantedById),
    check("chk_kb_page_grants_access", sql`access IN ('view', 'comment', 'edit', 'manage')`),
    check("chk_kb_page_grants_subject", sql`(user_id IS NOT NULL) OR (role IS NOT NULL)`),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_grants_org_page",
    }).onDelete("cascade"),
  ],
);

export const kbPageRestrictions = pgTable(
  "kb_page_restrictions",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: integer("page_id").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    role: text("role"),
    team: text("team"),
    level: text("level").$type<KbRestrictionLevel>().default("view").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_kb_page_restrictions_org_id").on(table.orgId, table.id),
    index("idx_kb_page_restrictions_page").on(table.pageId),
    index("idx_kb_page_restrictions_org_user").on(table.orgId, table.userId),
    index("idx_kb_page_restrictions_org_page").on(table.orgId, table.pageId),
    check("chk_kb_page_restrictions_level", sql`level IN ('view', 'edit')`),
    foreignKey({
      columns: [table.orgId, table.pageId],
      foreignColumns: [kbPages.orgId, kbPages.id],
      name: "fk_kb_page_restrictions_org_page",
    }).onDelete("cascade"),
  ],
);

export const kbSpacesRelations = relations(kbSpaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [kbSpaces.orgId],
    references: [organizations.id],
  }),
  members: many(kbSpaceMembers),
  pages: many(kbPages),
}));

export const kbSpaceMembersRelations = relations(kbSpaceMembers, ({ one }) => ({
  space: one(kbSpaces, { fields: [kbSpaceMembers.spaceId], references: [kbSpaces.id] }),
  user: one(users, { fields: [kbSpaceMembers.userId], references: [users.id] }),
}));

export const kbPagesRelations = relations(kbPages, ({ one, many }) => ({
  space: one(kbSpaces, { fields: [kbPages.spaceId], references: [kbSpaces.id] }),
  parent: one(kbPages, {
    fields: [kbPages.parentPageId],
    references: [kbPages.id],
    relationName: "kb_page_parent",
  }),
  children: many(kbPages, { relationName: "kb_page_parent" }),
  owner: one(users, { fields: [kbPages.ownerUserId], references: [users.id] }),
  favorites: many(kbPageFavorites),
  visits: many(kbPageVisits),
  outboundLinks: many(kbPageLinks, { relationName: "kb_link_source" }),
  inboundLinks: many(kbPageLinks, { relationName: "kb_link_target" }),
}));

export const kbPageLinksRelations = relations(kbPageLinks, ({ one }) => ({
  sourcePage: one(kbPages, {
    fields: [kbPageLinks.sourcePageId],
    references: [kbPages.id],
    relationName: "kb_link_source",
  }),
  targetPage: one(kbPages, {
    fields: [kbPageLinks.targetPageId],
    references: [kbPages.id],
    relationName: "kb_link_target",
  }),
}));
