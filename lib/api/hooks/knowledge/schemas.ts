/**
 * KB-0066: Zod schemas for the Knowledge Base responses.
 *
 * The hooks parse what comes back rather than asserting a type onto it. A KB
 * page carries content the editor will try to render, and a shape mismatch
 * should surface as one failed query rather than as a crash deep inside Plate.
 *
 * Streamline: SF/hooks/api/kb/*-schema.ts.
 */
import { z } from "zod";

/** Dates arrive as JSON strings; the UI formats them, so they stay strings. */
const timestamp = z.string().nullable();

export const kbCapabilitiesSchema = z.object({
  ai: z.boolean(),
  embeddings: z.boolean(),
  storage: z.boolean(),
  jobs: z.boolean(),
  email: z.boolean(),
  vector: z.boolean(),
  helpCentre: z.boolean(),
});
export type KbCapabilities = z.infer<typeof kbCapabilitiesSchema>;

export const KB_PAGE_VISIBILITIES = ["private", "org", "space", "project", "public"] as const;
export const KB_PAGE_STATUSES = ["draft", "published", "archived"] as const;

export const kbPageSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  spaceId: z.number().nullable().optional(),
  parentId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional(),
  visibility: z.string(),
  status: z.string(),
  contentType: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
  lastEditedById: z.string().nullable().optional(),
  contentRevision: z.number().optional(),
  isLocked: z.boolean().optional(),
  verifiedAt: timestamp.optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});
export type KbPageSummary = z.infer<typeof kbPageSummarySchema>;

/** The editor value is Plate JSON: an array of blocks, opaque to the hooks. */
export const kbPageSchema = kbPageSummarySchema.extend({
  content: z.unknown(),
  coverImageKey: z.string().nullable().optional(),
  coverColor: z.string().nullable().optional(),
  access: z.string().optional(),
  canEdit: z.boolean().optional(),
});
export type KbPage = z.infer<typeof kbPageSchema>;

/** Every list endpoint pages with a cursor, never an offset. */
export function kbCollection<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable().optional(),
    // The page collection also returns counts per status and content type,
    // over the whole filtered set rather than the page in hand.
    facets: z
      .object({
        status: z.record(z.string(), z.number()).optional(),
        contentType: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
  });
}

export const kbPageTreeNodeSchema = z.object({
  id: z.number(),
  title: z.string(),
  icon: z.string().nullable().optional(),
  parentId: z.number().nullable().optional(),
  spaceId: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  hasChildren: z.boolean().optional(),
  status: z.string().optional(),
});
export type KbPageTreeNode = z.infer<typeof kbPageTreeNodeSchema>;

export const kbSpaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  defaultVisibility: z.string().nullable().optional(),
  archivedAt: timestamp.optional(),
  pageCount: z.number().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});
export type KbSpace = z.infer<typeof kbSpaceSchema>;

export const kbSpaceMemberSchema = z.object({
  id: z.number(),
  spaceId: z.number(),
  userId: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  spaceRole: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});
export type KbSpaceMember = z.infer<typeof kbSpaceMemberSchema>;

export const kbPageVersionSchema = z.object({
  versionNumber: z.number(),
  title: z.string().nullable().optional(),
  changeSummary: z.string().nullable().optional(),
  authorId: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  createdAt: timestamp,
});
export type KbPageVersion = z.infer<typeof kbPageVersionSchema>;

export const kbPageVersionDetailSchema = kbPageVersionSchema.extend({
  content: z.unknown(),
  contentText: z.string().nullable().optional(),
});

export const kbPageCommentSchema = z.object({
  id: z.number(),
  pageId: z.number(),
  parentId: z.number().nullable().optional(),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string().nullable().optional(),
  authorImage: z.string().nullable().optional(),
  anchorBlockIndex: z.number().nullable().optional(),
  anchorQuote: z.string().nullable().optional(),
  resolvedAt: timestamp.optional(),
  resolvedById: z.string().nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp.optional(),
});
export type KbPageComment = z.infer<typeof kbPageCommentSchema>;

export const kbPageGrantSchema = z.object({
  id: z.number(),
  pageId: z.number(),
  userId: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  access: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  createdAt: timestamp.optional(),
});
export type KbPageGrant = z.infer<typeof kbPageGrantSchema>;

export const kbPageReviewSchema = z.object({
  id: z.number(),
  pageId: z.number(),
  pageTitle: z.string().nullable().optional(),
  reviewerId: z.string().nullable().optional(),
  reviewerName: z.string().nullable().optional(),
  status: z.string(),
  note: z.string().nullable().optional(),
  dueAt: timestamp.optional(),
  decidedAt: timestamp.optional(),
  createdAt: timestamp.optional(),
});
export type KbPageReview = z.infer<typeof kbPageReviewSchema>;

export const kbTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  content: z.unknown().optional(),
  isStarter: z.boolean().optional(),
  useCount: z.number().optional(),
  createdAt: timestamp.optional(),
});
export type KbTemplate = z.infer<typeof kbTemplateSchema>;

export const kbTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  pageCount: z.number().optional(),
});
export type KbTag = z.infer<typeof kbTagSchema>;

export const kbRecordLinkSchema = z.object({
  id: z.number(),
  pageId: z.number(),
  targetType: z.string(),
  targetId: z.string(),
  label: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  createdAt: timestamp.optional(),
});
export type KbRecordLink = z.infer<typeof kbRecordLinkSchema>;

export const kbAttachmentSchema = z.object({
  id: z.number(),
  pageId: z.number(),
  fileName: z.string(),
  fileKey: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  createdAt: timestamp.optional(),
});
export type KbAttachment = z.infer<typeof kbAttachmentSchema>;

export const kbTranslationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  status: z.string(),
  revision: z.number(),
  updatedAt: timestamp.optional(),
});
export type KbTranslation = z.infer<typeof kbTranslationSchema>;

export const kbSearchHitSchema = z.object({
  id: z.number(),
  title: z.string(),
  snippet: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  spaceId: z.number().nullable().optional(),
  spaceName: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  updatedAt: timestamp.optional(),
  rank: z.number().optional(),
});
export type KbSearchHit = z.infer<typeof kbSearchHitSchema>;

/** `mode` lets the UI say "keyword search" when there is no AI key. */
export const kbSearchResponseSchema = z.object({
  items: z.array(kbSearchHitSchema),
  nextCursor: z.string().nullable().optional(),
  mode: z.enum(["hybrid", "keyword"]).optional(),
});

export const kbImportJobSchema = z.object({
  id: z.number(),
  status: z.string(),
  sourceType: z.string().nullable().optional(),
  totalItems: z.number().nullable().optional(),
  processedItems: z.number().nullable().optional(),
  createdPageIds: z.array(z.number()).nullable().optional(),
  failedTitles: z.array(z.string()).nullable().optional(),
  error: z.string().nullable().optional(),
  retryOfJobId: z.number().nullable().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});
export type KbImportJob = z.infer<typeof kbImportJobSchema>;

export const kbImportPlanSchema = z.object({
  total: z.number(),
  newPages: z.number(),
  duplicates: z.number(),
  invalid: z.number(),
  items: z
    .array(z.object({ title: z.string(), outcome: z.string(), reason: z.string().optional() }))
    .optional(),
});

export const kbExportJobSchema = z.object({
  id: z.number(),
  status: z.string(),
  format: z.string(),
  scopeType: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  expiresAt: timestamp.optional(),
  createdAt: timestamp.optional(),
});
export type KbExportJob = z.infer<typeof kbExportJobSchema>;

export const kbSettingsSchema = z.object({
  orgId: z.string().optional(),
  trashRetentionDays: z.number(),
  verifiedWindowDays: z.number(),
  chatRetentionDays: z.number().nullable().optional(),
  defaultReviewIntervalDays: z.number().nullable().optional(),
  hrLinkEnabled: z.boolean().optional(),
  hrLinkPolicies: z.boolean().optional(),
  hrLinkHandbook: z.boolean().optional(),
  companyDocumentsEnabled: z.boolean().optional(),
  updatedAt: timestamp.optional(),
});
export type KbSettings = z.infer<typeof kbSettingsSchema>;

export const kbTrashItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  deletedAt: timestamp,
  deletedById: z.string().nullable().optional(),
  deletedByName: z.string().nullable().optional(),
  daysUntilPurge: z.number().nullable().optional(),
  childCount: z.number().optional(),
});
export type KbTrashItem = z.infer<typeof kbTrashItemSchema>;

export const kbPurgeImpactSchema = z.object({
  pages: z.number(),
  versions: z.number().optional(),
  comments: z.number().optional(),
  attachments: z.number().optional(),
  chunks: z.number().optional(),
  bytes: z.number().optional(),
});
