/**
 * KB-0033: fill content_text for pages that arrived without it.
 *
 * Migration 0185 copied the legacy project pages across but left content_text
 * NULL, because deriving it needs the Plate conversion, which lives in app code
 * rather than in SQL. Those rows are invisible to search until this runs.
 *
 * Batched, with a pause between batches, so a one-off backfill over a large
 * table does not sit on the connection pool the app is using.
 *
 * Streamline: SB/modules/kb/retrieval/kb-page-backfill.service.ts
 * (batch 50, 100 ms delay).
 */
import "server-only";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { legacyToPlate } from "@/components/editor/plate/plate-value-convert";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

import { buildExcerpt, extractContentText } from "./content";

export const BACKFILL_BATCH_SIZE = 50;
export const BACKFILL_BATCH_DELAY_MS = 100;

export interface BackfillResult {
  scanned: number;
  updated: number;
  /** True when rows are still waiting, so the caller can come back. */
  more: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How many pages still have content but no text. */
export async function countPagesMissingContentText(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(kbPages)
    .where(and(isNotNull(kbPages.content), isNull(kbPages.contentText)));
  return row?.count ?? 0;
}

/**
 * One batch. The cron sweep calls this once per run (KB-0101) and the script
 * loops until `more` is false.
 */
export async function backfillContentTextBatch(
  limit = BACKFILL_BATCH_SIZE,
): Promise<BackfillResult> {
  const pages = await db
    .select({ id: kbPages.id, orgId: kbPages.orgId, content: kbPages.content })
    .from(kbPages)
    .where(and(isNotNull(kbPages.content), isNull(kbPages.contentText)))
    .limit(limit);

  let updated = 0;
  for (const page of pages) {
    const value = legacyToPlate(page.content);
    const contentText = extractContentText(value);

    await db
      .update(kbPages)
      .set({
        // Legacy rows keep their original content JSON; only the derived
        // columns are written, so nothing is lost if the conversion is wrong.
        contentText,
        excerpt: buildExcerpt(contentText),
      })
      .where(and(eq(kbPages.id, page.id), eq(kbPages.orgId, page.orgId)));
    updated += 1;
  }

  return { scanned: pages.length, updated, more: pages.length === limit };
}

/** Loops the batches. Returns the totals. */
export async function backfillContentText(
  options: { batchSize?: number; delayMs?: number; maxBatches?: number } = {},
): Promise<{ scanned: number; updated: number; batches: number }> {
  const batchSize = options.batchSize ?? BACKFILL_BATCH_SIZE;
  const delayMs = options.delayMs ?? BACKFILL_BATCH_DELAY_MS;
  const maxBatches = options.maxBatches ?? 1_000;

  let scanned = 0;
  let updated = 0;
  let batches = 0;

  for (; batches < maxBatches; batches += 1) {
    const result = await backfillContentTextBatch(batchSize);
    scanned += result.scanned;
    updated += result.updated;
    if (!result.more) {
      batches += 1;
      break;
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  logger.info("kb.backfill.content_text", { scanned, updated, batches });
  return { scanned, updated, batches };
}
