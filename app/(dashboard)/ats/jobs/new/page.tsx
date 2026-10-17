import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsRequisitions, departments, organizationMembers, users } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EMPTY_JOB, JobForm } from "@/features/ats/jobs/job-form";

export const dynamic = "force-dynamic";

/**
 * MIYO-0633: a new job, optionally prefilled from an approved requisition.
 * A requisition that was not approved cannot seed one.
 */
export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ requisitionId?: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const requisitionId = Number((await searchParams).requisitionId);
  const requisition = Number.isInteger(requisitionId)
    ? await db.query.atsRequisitions.findFirst({
        where: and(eq(atsRequisitions.id, requisitionId), eq(atsRequisitions.orgId, orgId)),
      })
    : null;

  if (requisition && requisition.status !== "APPROVED") {
    return (
      <PageWrapper title="New job" subtitle="Post a role">
        <EmptyState
          title="That requisition is not approved"
          description="Only an approved hiring request can become a job."
        />
      </PageWrapper>
    );
  }

  const [departmentRows, people] = await Promise.all([
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
    <PageWrapper title="New job" subtitle="Post a role">
      <JobForm
        departments={departmentRows}
        people={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
        initial={
          requisition
            ? {
                ...EMPTY_JOB,
                title: requisition.title,
                requisitionId: requisition.id,
                departmentId: requisition.departmentId,
                location: requisition.location,
                employmentType: requisition.employmentType ?? "FULL_TIME",
                openings: requisition.openings,
                salaryMin: requisition.salaryMin,
                salaryMax: requisition.salaryMax,
              }
            : undefined
        }
      />
    </PageWrapper>
  );
}
