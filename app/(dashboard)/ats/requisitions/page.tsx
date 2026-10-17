import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsRequisitions, departments } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIST } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Waiting for approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FILLED: "Filled",
  CANCELLED: "Cancelled",
};

/** MIYO-0632: every hiring request in the org, newest first. */
export default async function RequisitionsPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const rows = await db
    .select({
      id: atsRequisitions.id,
      title: atsRequisitions.title,
      status: atsRequisitions.status,
      openings: atsRequisitions.openings,
      location: atsRequisitions.location,
      departmentName: departments.name,
      createdAt: atsRequisitions.createdAt,
    })
    .from(atsRequisitions)
    .leftJoin(departments, eq(departments.id, atsRequisitions.departmentId))
    .where(eq(atsRequisitions.orgId, orgId))
    .orderBy(desc(atsRequisitions.createdAt));

  return (
    <PageWrapper
      title="Requisitions"
      subtitle="Hiring requests and their approvals"
      actions={
        <Button asChild>
          <Link href="/ats/requisitions/new">New request</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No hiring requests yet"
          description="A requisition records what you want to hire and who approved it."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <Link
                    href={`/ats/requisitions/${row.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      row.departmentName,
                      row.location,
                      pluralise(row.openings, "opening"),
                      row.createdAt
                        ? `raised ${formatIST(row.createdAt, { day: "numeric", month: "short" })} IST`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Badge variant={row.status === "APPROVED" ? "default" : "secondary"}>
                  {STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
