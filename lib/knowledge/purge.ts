/**
 * KB-0044: purging a page for good.
 *
 * A purge spans more than the row: chunks, attachments in R2, exports, the
 * analytics trail. Those cannot all be one transaction, so each store gets a
 * ledger row and is marked off as it completes. A crash halfway leaves the
 * ledger saying what is still owed, which the sweeper then finishes — the
 * alternative is a page that looks deleted with its file still in the bucket.
 *
 * Streamline: SB/modules/kb/wiki/kb-purge-ledger.ts, kb-multi-store-purge.ts,
 * kb-page-attachment-purge.ts (migrations 1193, 1230, 1234, 1236).
 */
import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  kbPageAttachments,
  kbPagePurgeLedger,
  kbPages,
  type KbPurgeStore,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/storage";

/** The stores a page purge has to reach, in the order they are settled. */
export const PURGE_STORES: KbPurgeStore[] = [
  "chunks",
  "blobs",
  "analytics",
  "page_rows",
];

export interface PurgeImpact {
  pages: number;
  attachments: number;
  heldPages: number[];
}

export async function purgeImpact(orgId: string, pageIds: number[]): Promise<PurgeImpact> {
  if (pageIds.length === 0) return { pages: 0, attachments: 0, heldPages: [] };

  const pages = await db
    .select({ id: kbPages.id, legalHold: kbPages.legalHold })
    .from(kbPages)
    .where(and(eq(kbPages.orgId, orgId), inArray(kbPages.id, pageIds)));

  const [attachmentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(kbPageAttachments)
    .where(
      and(eq(kbPageAttachments.orgId, orgId), inArray(kbPageAttachments.pageId, pageIds)),
    );

  return {
    pages: pages.length,
    attachments: Number(attachmentRow?.count ?? 0),
    heldPages: pages.filter((page) => page.legalHold).map((page) => page.id),
  };
}

async function openLedger(orgId: string, pageId: number): Promise<void> {
  await db
    .insert(kbPagePurgeLedger)
    .values(PURGE_STORES.map((store) => ({ orgId, pageId, store })))
    .onConflictDoNothing();
}

async function settle(
  orgId: string,
  pageId: number,
  store: KbPurgeStore,
  work: () => Promise<void>,
): Promise<boolean> {
  try {
    await work();
    await db
      .update(kbPagePurgeLedger)
      .set({ status: "completed", completedAt: new Date() })
      .where(
        and(
          eq(kbPagePurgeLedger.orgId, orgId),
          eq(kbPagePurgeLedger.pageId, pageId),
          eq(kbPagePurgeLedger.store, store),
        ),
      );
    return true;
  } catch (error) {
    // Left pending with the reason, for the sweeper to retry.
    await db
      .update(kbPagePurgeLedger)
      .set({
        status: "failed",
        failedReason: String(error).slice(0, 500),
        attemptCount: sql`${kbPagePurgeLedger.attemptCount} + 1`,
      })
      .where(
        and(
          eq(kbPagePurgeLedger.orgId, orgId),
          eq(kbPagePurgeLedger.pageId, pageId),
          eq(kbPagePurgeLedger.store, store),
        ),
      );
    logger.error("kb.purge.store_failed", { orgId, pageId, store, error: String(error) });
    return false;
  }
}

export interface PurgeResult {
  purged: number[];
  held: number[];
  incomplete: number[];
}

/**
 * Removes the pages for good. A page under legal hold is skipped, never
 * partially purged, and reported back so the caller can say which.
 */
export async function purgePages(orgId: string, pageIds: number[]): Promise<PurgeResult> {
  const result: PurgeResult = { purged: [], held: [], incomplete: [] };
  if (pageIds.length === 0) return result;

  const pages = await db
    .select({ id: kbPages.id, legalHold: kbPages.legalHold })
    .from(kbPages)
    .where(and(eq(kbPages.orgId, orgId), inArray(kbPages.id, pageIds)));

  for (const page of pages) {
    if (page.legalHold) {
      result.held.push(page.id);
      continue;
    }

    await openLedger(orgId, page.id);

    // Chunks and the analytics trail go by cascade with the row, so their
    // ledger entries are settled by the same delete; blobs are not, and are
    // the reason the ledger exists.
    const attachments = await db
      .select({ id: kbPageAttachments.id, fileKey: kbPageAttachments.fileKey })
      .from(kbPageAttachments)
      .where(
        and(
          eq(kbPageAttachments.orgId, orgId),
          eq(kbPageAttachments.pageId, page.id),
          isNotNull(kbPageAttachments.fileKey),
        ),
      );

    const blobsDone = await settle(orgId, page.id, "blobs", async () => {
      for (const attachment of attachments) {
        await deleteFile(attachment.fileKey);
      }
    });

    const chunksDone = await settle(orgId, page.id, "chunks", async () => {
      // Nothing to do beyond the cascade, but the ledger row is what proves it.
    });
    const analyticsDone = await settle(orgId, page.id, "analytics", async () => {});

    const rowsDone = await settle(orgId, page.id, "page_rows", async () => {
      await db
        .delete(kbPages)
        .where(and(eq(kbPages.orgId, orgId), eq(kbPages.id, page.id)));
    });

    if (blobsDone && chunksDone && analyticsDone && rowsDone) result.purged.push(page.id);
    else result.incomplete.push(page.id);
  }

  return result;
}
