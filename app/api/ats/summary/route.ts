import type { NextRequest } from "next/server";
import { and, count, eq, gte, inArray, lt } from "drizzle-orm";

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateApplications, interviews, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { getTodayString } from "@/lib/date-utils";

/** MIYO-0677: the three numbers the dashboard widget shows. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    const { allowed, jobIds } = await atsPageAccess({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (!allowed) return err("Not found.", 404);

    const today = getTodayString();
    const dayStart = new Date(`${today}T00:00:00+05:30`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [openJobs, applicationsThisWeek, interviewsToday] = await Promise.all([
      db
        .select({ value: count() })
        .from(jobPostings)
        .where(
          and(
            eq(jobPostings.orgId, session.orgId),
            eq(jobPostings.status, "OPEN"),
            jobIds ? inArray(jobPostings.id, jobIds) : undefined,
          ),
        ),
      db
        .select({ value: count() })
        .from(candidateApplications)
        .where(
          and(
            eq(candidateApplications.orgId, session.orgId),
            gte(candidateApplications.appliedAt, weekStart),
            jobIds ? inArray(candidateApplications.jobPostingId, jobIds) : undefined,
          ),
        ),
      db
        .select({ value: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.orgId, session.orgId),
            gte(interviews.scheduledAt, dayStart),
            lt(interviews.scheduledAt, dayEnd),
            jobIds ? inArray(interviews.jobPostingId, jobIds) : undefined,
          ),
        ),
    ]);

    return ok({
      openJobs: openJobs[0]?.value ?? 0,
      applicationsThisWeek: applicationsThisWeek[0]?.value ?? 0,
      interviewsToday: interviewsToday[0]?.value ?? 0,
    });
  }, req);
}
