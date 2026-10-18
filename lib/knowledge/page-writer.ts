/**
 * KB-0029: the single write path for a page.
 *
 * Every save, publish, restore and move goes through here, so the four things
 * that must happen together cannot be forgotten in one caller: a version
 * snapshot, the link re-sync, the derived text and excerpt, and the revision
 * bump. They share one transaction.
 *
 * What deliberately happens *after* the commit: the audit entry, mention
 * notifications and the indexing event. The last two talk to a provider
 * (ZeptoMail, Inngest, OpenAI further down), and a provider call inside a
 * transaction holds a database connection open across a network round trip.
 * createAuditLog writes on its own connection and swallows its failures, so it
 * joins them rather than being able to roll the edit back.
 *
 * Streamline: SB/modules/kb/wiki/kb-page-writer.service.ts,
 * kb-page-edit.util.ts (VERSION_WINDOW_MS = 10 * 60 * 1000),
 * kb-no-provider-call-inside-transaction.spec.ts.
 */
import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { createAuditLog, type AuditAction } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPageLinks, kbPages, kbPageVersions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

import { buildExcerpt, extractContentText, extractMentions, extractPageLinks } from "./content";

/** A snapshot at most every 10 minutes, unless the caller forces one. */
export const VERSION_WINDOW_MS = 10 * 60 * 1000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CommitPageInput {
  orgId: string;
  pageId: number;
  actorId: string;
  /** What the page now says. Omit to leave the content alone (a move, a lock). */
  content?: unknown;
  title?: string;
  /** The audit action to record. */
  action: AuditAction;
  /** Snapshot regardless of the window: a restore, a publish, a verify. */
  forceVersion?: boolean;
  changeSummary?: string | null;
  /** The revision the editor had. A mismatch is a conflict, not a last-write-wins. */
  expectedRevision?: number;
  metadata?: Record<string, unknown>;
}

export interface CommitPageResult {
  contentRevision: number;
  contentText: string | null;
  excerpt: string | null;
  /** Mentions in the new content that the previous content did not have. */
  newMentions: string[];
  /** True when the content changed and the page needs reindexing. */
  reindex: boolean;
}

export class KbPageConflictError extends Error {
  constructor(readonly currentRevision: number) {
    super("Page changed while you were editing it");
    this.name = "KbPageConflictError";
  }
}

/** Pure: the window rule on its own, so it is testable without a clock. */
export function needsSnapshot(
  newest: { createdAt: Date } | null | undefined,
  now: Date,
  force = false,
): boolean {
  if (force) return true;
  if (!newest) return true;
  return now.getTime() - newest.createdAt.getTime() > VERSION_WINDOW_MS;
}

/**
 * Records the page as it stands *before* the edit, so the history holds what
 * was replaced rather than what replaced it.
 */
export async function snapshotIfNeeded(
  tx: Tx,
  orgId: string,
  page: { id: number; title: string; content: unknown; contentText: string | null },
  authorId: string,
  options: { force?: boolean; changeSummary?: string | null; now?: Date } = {},
): Promise<boolean> {
  if (!page.content) return false;

  const newest = await tx.query.kbPageVersions.findFirst({
    where: and(eq(kbPageVersions.pageId, page.id), eq(kbPageVersions.orgId, orgId)),
    orderBy: [desc(kbPageVersions.versionNumber)],
    columns: { versionNumber: true, createdAt: true },
  });

  if (!needsSnapshot(newest, options.now ?? new Date(), options.force)) return false;

  await tx.insert(kbPageVersions).values({
    orgId,
    pageId: page.id,
    versionNumber: (newest?.versionNumber ?? 0) + 1,
    title: page.title,
    content: page.content as never,
    contentText: page.contentText,
    changeSummary: options.changeSummary ?? null,
    authorId,
  });
  return true;
}

/** Replaces this page's outbound links with the ones the content now holds. */
export async function resyncPageLinks(
  tx: Tx,
  orgId: string,
  pageId: number,
  content: unknown,
): Promise<void> {
  await tx
    .delete(kbPageLinks)
    .where(and(eq(kbPageLinks.orgId, orgId), eq(kbPageLinks.sourcePageId, pageId)));

  const links = extractPageLinks(content);
  if (links.length === 0) return;

  // A link to a page that has since been deleted, or to one in another org,
  // would fail the composite foreign key, so page targets are checked first.
  const pageTargets = links
    .map((link) => link.targetPageId)
    .filter((id): id is number => typeof id === "number");

  const live = pageTargets.length
    ? await tx.query.kbPages.findMany({
        where: and(
          eq(kbPages.orgId, orgId),
          inArray(kbPages.id, pageTargets),
          isNull(kbPages.deletedAt),
        ),
        columns: { id: true },
      })
    : [];
  const liveIds = new Set(live.map((p) => p.id));

  const rows = links
    .filter((link) => (link.targetPageId ? liveIds.has(link.targetPageId) : true))
    .map((link) => ({
      orgId,
      sourcePageId: pageId,
      targetPageId: link.targetPageId ?? null,
      targetType: link.targetType,
      targetId: link.targetId ?? null,
      label: link.label ?? null,
    }));

  if (rows.length === 0) return;
  await tx.insert(kbPageLinks).values(rows).onConflictDoNothing();
}

/**
 * One transaction: snapshot, links, derived text, revision bump, audit.
 * The caller runs the returned side effects afterwards.
 */
export async function commitPageChange(input: CommitPageInput): Promise<CommitPageResult> {
  const { orgId, pageId, actorId } = input;

  const result = await db.transaction(async (tx) => {
    const current = await tx.query.kbPages.findFirst({
      where: and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)),
      columns: {
        id: true,
        title: true,
        content: true,
        contentText: true,
        contentRevision: true,
      },
    });
    if (!current) throw new KbPageConflictError(0);

    if (
      typeof input.expectedRevision === "number" &&
      input.expectedRevision !== current.contentRevision
    ) {
      throw new KbPageConflictError(current.contentRevision);
    }

    const contentChanged = input.content !== undefined;

    await snapshotIfNeeded(
      tx,
      orgId,
      {
        id: current.id,
        title: current.title,
        content: current.content,
        contentText: current.contentText ?? null,
      },
      actorId,
      { force: input.forceVersion, changeSummary: input.changeSummary },
    );

    const contentText = contentChanged ? extractContentText(input.content) : (current.contentText ?? null);
    const excerpt = contentChanged ? buildExcerpt(contentText) : null;
    const contentRevision = current.contentRevision + 1;

    await tx
      .update(kbPages)
      .set({
        ...(contentChanged ? { content: input.content as never, contentText, excerpt } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        contentRevision,
        lastEditedById: actorId,
        updatedAt: new Date(),
      })
      .where(and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)));

    if (contentChanged) {
      await resyncPageLinks(tx, orgId, pageId, input.content);
    }

    const previousMentions = contentChanged ? extractMentions(current.content) : [];
    const newMentions = contentChanged
      ? extractMentions(input.content).filter((id) => !previousMentions.includes(id) && id !== actorId)
      : [];

    return { contentRevision, contentText, excerpt, newMentions, reindex: contentChanged };
  });

  // Outside the transaction on purpose: see the note at the top of the file.
  await createAuditLog({
    action: input.action,
    userId: actorId,
    orgId,
    targetId: String(pageId),
    targetType: "kb_page",
    metadata: { contentRevision: result.contentRevision, ...input.metadata },
  });

  logger.info("kb.page.committed", {
    orgId,
    pageId,
    action: input.action,
    contentRevision: result.contentRevision,
    mentions: result.newMentions.length,
  });

  return result;
}
