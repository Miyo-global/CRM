import type { KbImportJob } from "@/lib/api/hooks/knowledge";
import type { Tone } from "@/lib/design/tones";

/** KB-0088: what an import job's status means, and how it reads. */
export function importJobLabel(job: Pick<KbImportJob, "status">): { label: string; tone: Tone } {
  switch (job.status) {
    case "pending":
      return { label: "Queued", tone: "neutral" };
    case "processing":
      return { label: "Importing", tone: "info" };
    case "completed":
      return { label: "Done", tone: "success" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "cancelled":
      return { label: "Cancelled", tone: "warning" };
    default:
      return { label: job.status, tone: "neutral" };
  }
}

/**
 * A job that finished with some items failing is still "done" — the pages that
 * came through are real — so the count is what tells the story.
 */
export function importJobSummary(job: KbImportJob): string {
  if (job.status === "pending") return "Waiting to start";
  if (job.status === "processing") return `${job.processedItems} of ${job.totalItems}`;

  const parts = [`${job.succeededItems} imported`];
  if (job.duplicateItems > 0) parts.push(`${job.duplicateItems} already there`);
  if (job.failedItems > 0) parts.push(`${job.failedItems} failed`);
  return parts.join(", ");
}

export function importJobFailedTitles(job: KbImportJob): string[] {
  return (job.errorReport?.errors ?? []).map((error) => error.title);
}

/** A job still moving is worth polling; a finished one is not. */
export function importJobIsRunning(job: Pick<KbImportJob, "status">): boolean {
  return job.status === "pending" || job.status === "processing";
}
