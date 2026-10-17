import { notFound } from "next/navigation";
import Link from "next/link";
import { and, count, eq, gte, lt, inArray } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { candidateApplications, interviews, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { visibleJobIds } from "@/lib/ats/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIST, getTodayString } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";

export const dynamic = "force-dynamic";

/**
 * MIYO-0631: the ATS overview. Three numbers a recruiter opens the morning
 * with — jobs taking applications, applications that arrived today, and the
 * interviews happening today — scoped to the jobs this person is on.
 */
export default async function AtsOverviewPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { userId, orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const jobIds = await visibleJobIds({ userId, orgId, role: member.role });
  // An empty list means "on no hiring team"; null means "every job".
  if (jobIds?.length === 0) {
    return (
      <PageWrapper title="Hiring" subtitle="Applicant tracking">
        <EmptyState
          title="No hiring teams yet"
          description="You will see jobs here once someone adds you to a hiring team."
        />
      </PageWrapper>
    );
  }

  const jobScope = jobIds ? inArray(jobPostings.id, jobIds) : undefined;
  const applicationScope = jobIds
    ? inArray(candidateApplications.jobPostingId, jobIds)
    : undefined;
  const interviewScope = jobIds ? inArray(interviews.jobPostingId, jobIds) : undefined;

  const today = getTodayString();
  const dayStart = new Date(`${today}T00:00:00+05:30`);
  const dayEnd = new Date(`${today}T00:00:00+05:30`);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [openJobs, newApplications, todaysInterviews] = await Promise.all([
    db
      .select({ value: count() })
      .from(jobPostings)
      .where(and(eq(jobPostings.orgId, orgId), eq(jobPostings.status, "OPEN"), jobScope)),
    db
      .select({ value: count() })
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.orgId, orgId),
          gte(candidateApplications.appliedAt, dayStart),
          lt(candidateApplications.appliedAt, dayEnd),
          applicationScope,
        ),
      ),
    db
      .select({ value: count() })
      .from(interviews)
      .where(
        and(
          eq(interviews.orgId, orgId),
          gte(interviews.scheduledAt, dayStart),
          lt(interviews.scheduledAt, dayEnd),
          interviewScope,
        ),
      ),
  ]);

  const stats = [
    { label: "Open jobs", value: openJobs[0]?.value ?? 0, href: "/ats/jobs" },
    { label: "Applied today", value: newApplications[0]?.value ?? 0, href: "/ats/candidates" },
    { label: "Interviews today", value: todaysInterviews[0]?.value ?? 0, href: "/ats/interviews" },
  ];

  return (
    <PageWrapper
      title="Hiring"
      subtitle={`Applicant tracking · ${formatIST(dayStart, { day: "numeric", month: "short", year: "numeric" })} IST`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {pluralise(stats[0].value, "job")} taking applications.{" "}
        <Link href="/ats/jobs" className="underline underline-offset-4">
          Open the job list
        </Link>
        .
      </p>
    </PageWrapper>
  );
}
