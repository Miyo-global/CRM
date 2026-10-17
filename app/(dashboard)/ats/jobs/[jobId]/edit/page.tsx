import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsJobMembers, departments, jobPostings, organizationMembers, users } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { jobCapabilities } from "@/lib/ats/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { JobForm } from "@/features/ats/jobs/job-form";
import { JobStatusActions } from "@/features/ats/jobs/job-status-actions";

export const dynamic = "force-dynamic";

/** MIYO-0633: edit a job; MIYO-0634 puts the state buttons beside it. */
export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;
  const jobId = Number((await params).jobId);
  if (!Number.isInteger(jobId)) notFound();

  const capabilities = await jobCapabilities({ userId, orgId, role: member.role }, jobId);
  if (!capabilities.has("manage_job")) notFound();

  const job = await db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, orgId)),
  });
  if (!job) notFound();

  const [team, departmentRows, people] = await Promise.all([
    db
      .select({ userId: atsJobMembers.userId })
      .from(atsJobMembers)
      .where(eq(atsJobMembers.jobId, jobId)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.orgId, orgId))
      .orderBy(asc(departments.name)),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
      .orderBy(asc(users.name)),
  ]);

  return (
    <PageWrapper
      title={job.title}
      subtitle="Job posting"
      actions={
        <JobStatusActions
          jobId={job.id}
          status={job.status ?? "DRAFT"}
          slug={job.slug}
        />
      }
    >
      <JobForm
        departments={departmentRows}
        people={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
        initial={{
          id: job.id,
          title: job.title,
          requisitionId: job.requisitionId,
          departmentId: job.departmentId,
          workMode: job.workMode ?? "ONSITE",
          location: job.location,
          employmentType: job.type ?? "FULL_TIME",
          openings: job.openings ?? 1,
          description: job.description ?? "",
          requirements: job.requirements,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryVisible: job.salaryVisible ?? false,
          closesAt: job.closesAt ? job.closesAt.toISOString().slice(0, 10) : null,
          seoTitle: job.seoTitle,
          seoDescription: job.seoDescription,
          hiringTeam: team.map((t) => t.userId),
        }}
      />
    </PageWrapper>
  );
}
