import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { departments, organizationMembers, users } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequisitionForm } from "@/features/ats/requisitions/requisition-form";

export const dynamic = "force-dynamic";

/** MIYO-0632: raise a hiring request. */
export default async function NewRequisitionPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

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
    <PageWrapper title="New requisition" subtitle="Ask to hire">
      <RequisitionForm
        departments={departmentRows}
        people={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
      />
    </PageWrapper>
  );
}
