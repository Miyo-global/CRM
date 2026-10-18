/**
 * KB-0033: one-off backfill of kb_pages.content_text.
 *
 *   pnpm tsx --env-file=.env scripts/kb-backfill-content-text.ts
 *
 * Safe to re-run: it only touches rows that have content and no text.
 */
import "dotenv/config";

import {
  backfillContentText,
  countPagesMissingContentText,
} from "@/lib/knowledge/backfill-content-text";

async function main() {
  const before = await countPagesMissingContentText();
  console.log(`kb_pages missing content_text: ${before}`);
  if (before === 0) return;

  const { scanned, updated, batches } = await backfillContentText();
  const after = await countPagesMissingContentText();

  console.log(`scanned ${scanned}, updated ${updated}, batches ${batches}`);
  console.log(`remaining: ${after}`);
  if (after > 0) process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
