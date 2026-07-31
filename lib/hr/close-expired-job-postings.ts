import "server-only";

import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { getTodayIST } from "@/lib/careers/application-deadline";
import { notifyHrRecruitmentEvent } from "@/lib/hr/recruitment-notifications";
import { logger } from "@/lib/logger";

export interface CloseExpiredJobsResult {
  closedCount: number;
  closedJobs: { id: number; title: string; orgId: string }[];
}

export async function closeExpiredJobPostings(): Promise<CloseExpiredJobsResult> {
  const todayIST = getTodayIST();

  const expired = await db
    .update(jobPostings)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(
      and(
        eq(jobPostings.status, "OPEN"),
        isNotNull(jobPostings.applicationDeadline),
        lt(jobPostings.applicationDeadline, todayIST),
      ),
    )
    .returning({
      id: jobPostings.id,
      title: jobPostings.title,
      orgId: jobPostings.orgId,
    });

  if (expired.length === 0) {
    return { closedCount: 0, closedJobs: [] };
  }

  const byOrg = new Map<string, typeof expired>();
  for (const job of expired) {
    const list = byOrg.get(job.orgId) ?? [];
    list.push(job);
    byOrg.set(job.orgId, list);
  }

  for (const [orgId, jobs] of byOrg) {
    if (jobs.length === 1) {
      const job = jobs[0]!;
      void notifyHrRecruitmentEvent(orgId, "applications_auto_closed", {
        jobId: job.id,
        jobTitle: job.title,
        closedCount: 1,
      }).catch((err) => {
        logger.error("Failed to notify auto-close for job", {
          jobId: job.id,
          error: err instanceof Error ? err.message : "Unknown",
        });
      });
    } else {
      void notifyHrRecruitmentEvent(orgId, "applications_auto_closed", {
        jobId: jobs[0]!.id,
        jobTitle: jobs[0]!.title,
        closedCount: jobs.length,
      }).catch((err) => {
        logger.error("Failed to notify bulk auto-close", {
          orgId,
          error: err instanceof Error ? err.message : "Unknown",
        });
      });
    }
  }

  return { closedCount: expired.length, closedJobs: expired };
}
