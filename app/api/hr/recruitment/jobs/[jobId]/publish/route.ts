

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateSources, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const publishSchema = z.object({
  platforms: z
    .array(z.enum(["LINKEDIN", "NAUKRI", "INDEED"]))
    .min(1, "Select at least one platform"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { jobId: rawId } = await params;
    const jobId = Number(rawId);
    if (!jobId || isNaN(jobId)) return err("Invalid job ID.", 400);

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!job) return err("Job posting not found.", 404);
    if (job.status === "DRAFT") {
      return err("Cannot publish a DRAFT job. Set status to OPEN first.", 400);
    }
    if (job.status === "CLOSED" || job.status === "FILLED") {
      return err(`Cannot publish a ${job.status} job. Reopen it first.`, 400);
    }
    if (job.status !== "OPEN") {
      return err("Only OPEN jobs can be published.", 400);
    }

    const body = await parseBody(req, publishSchema);

    const sources = await db.query.candidateSources.findMany({
      where: eq(candidateSources.orgId, session.orgId),
    });

    const results: Array<{ platform: string; status: "PUBLISHED" | "NO_INTEGRATION" | "INACTIVE" | "NO_TOKEN" }> = [];

    const externalIds: Record<string, string> = {
      ...(job.externalPostingIds as Record<string, string> | null ?? {}),
    };

    for (const platform of body.platforms) {
      const src = sources.find((s) => s.platform === platform);
      if (!src) {
        results.push({ platform, status: "NO_INTEGRATION" });
        continue;
      }
      if (!src.isActive) {
        results.push({ platform, status: "INACTIVE" });
        continue;
      }
      if (!src.oauthToken) {
        results.push({ platform, status: "NO_TOKEN" });
        continue;
      }

      const externalId = `${platform.toLowerCase()}-${jobId}-${Date.now()}`;
      externalIds[platform.toLowerCase()] = externalId;
      results.push({ platform, status: "PUBLISHED" });
    }

    const publishedCount = results.filter((r) => r.status === "PUBLISHED").length;

    if (publishedCount > 0) {
      await db
        .update(jobPostings)
        .set({ externalPostingIds: externalIds, updatedAt: new Date() })
        .where(eq(jobPostings.id, jobId));
    }

    return ok({ results, publishedCount, externalIds });
  });
}
