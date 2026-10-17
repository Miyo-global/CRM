import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsActivity, atsRequisitions, departments, users } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole, ROLES } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatIST } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";
import { RequisitionDecision } from "@/features/ats/requisitions/requisition-decision";
import { SubmitDraftButton } from "@/features/ats/requisitions/submit-draft-button";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Waiting for approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FILLED: "Filled",
  CANCELLED: "Cancelled",
};

const ACTIVITY_LABELS: Record<string, string> = {
  requisition_created: "Created",
  requisition_edited: "Edited",
  requisition_submitted: "Sent for approval",
  requisition_approved: "Approved",
  requisition_rejected: "Rejected",
  requisition_cancelled: "Cancelled",
};

function money(value: string | null): string | null {
  if (!value) return null;
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** MIYO-0632: one hiring request, its decision and its history. */
export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ requisitionId: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const requisitionId = Number((await params).requisitionId);
  if (!Number.isInteger(requisitionId)) notFound();

  const rows = await db
    .select({
      requisition: atsRequisitions,
      departmentName: departments.name,
    })
    .from(atsRequisitions)
    .leftJoin(departments, eq(departments.id, atsRequisitions.departmentId))
    .where(and(eq(atsRequisitions.id, requisitionId), eq(atsRequisitions.orgId, orgId)))
    .limit(1);

  const found = rows[0];
  if (!found) notFound();
  const requisition = found.requisition;

  const history = await db
    .select({
      id: atsActivity.id,
      type: atsActivity.type,
      data: atsActivity.data,
      createdAt: atsActivity.createdAt,
      actorName: users.name,
    })
    .from(atsActivity)
    .leftJoin(users, eq(users.id, atsActivity.actorId))
    .where(eq(atsActivity.requisitionId, requisitionId))
    .orderBy(desc(atsActivity.createdAt), asc(atsActivity.id));

  const salary = [money(requisition.salaryMin), money(requisition.salaryMax)].filter(Boolean);
  const canDecide =
    requisition.status === "PENDING" &&
    (requisition.approverId === userId ||
      member.role === ROLES.CEO ||
      member.role === ROLES.HR ||
      member.role === ROLES.ADMIN);
  const canSubmit = requisition.status === "DRAFT" || requisition.status === "REJECTED";

  const facts: [string, string][] = [
    ["Department", found.departmentName ?? "not set"],
    ["Location", requisition.location ?? "not set"],
    ["Openings", pluralise(requisition.openings, "opening")],
    [
      "Monthly salary",
      salary.length === 2
        ? `${salary[0]} – ${salary[1]}`
        : salary.length === 1
          ? salary[0]!
          : "not stated",
    ],
    ["Why this hire", requisition.justification?.trim() || "not stated"],
  ];

  return (
    <PageWrapper
      title={requisition.title}
      subtitle="Hiring request"
      badge={
        <Badge variant={requisition.status === "APPROVED" ? "default" : "secondary"}>
          {STATUS_LABELS[requisition.status] ?? requisition.status}
        </Badge>
      }
      actions={
        requisition.status === "APPROVED" ? (
          <Button asChild>
            <Link href={`/ats/jobs/new?requisitionId=${requisition.id}`}>Create the job</Link>
          </Button>
        ) : canSubmit ? (
          <SubmitDraftButton requisitionId={requisition.id} />
        ) : null
      }
    >
      <Card>
        <CardContent className="grid gap-3 p-5 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground">{value}</span>
            </div>
          ))}
          {requisition.decisionNote && (
            <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <span className="text-muted-foreground">Decision comment</span>
              <span className="text-foreground">{requisition.decisionNote}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {canDecide && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-medium text-foreground">Your decision</h2>
          <RequisitionDecision requisitionId={requisition.id} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-base font-medium text-foreground">History</h2>
        <ul className="grid gap-2 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap gap-x-3 text-muted-foreground">
              <span className="text-foreground">
                {ACTIVITY_LABELS[entry.type] ?? entry.type}
              </span>
              <span>{entry.actorName ?? "Someone"}</span>
              <span>
                {entry.createdAt
                  ? `${formatIST(entry.createdAt, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} IST`
                  : ""}
              </span>
              {typeof (entry.data as { comment?: string } | null)?.comment === "string" && (
                <span>“{(entry.data as { comment: string }).comment}”</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </PageWrapper>
  );
}
