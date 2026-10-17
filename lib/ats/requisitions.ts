import "server-only";

import { and, eq } from "drizzle-orm";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { atsActivity, atsRequisitions, departments, organizationMembers, users } from "@/lib/db/schema";
import { sendTemplateEmail } from "@/lib/email/sender";
import { ROLES } from "@/lib/constants/roles";
import { logger } from "@/lib/logger";

export type RequisitionStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FILLED"
  | "CANCELLED";

/**
 * MIYO-0632: every state change on a requisition lands in ats_activity, so
 * the detail page can show who asked, who decided and when, without a second
 * audit table.
 */
export async function logRequisitionActivity(params: {
  orgId: string;
  requisitionId: number;
  actorId: string | null;
  type: string;
  data?: Record<string, unknown>;
}) {
  await db.insert(atsActivity).values({
    orgId: params.orgId,
    requisitionId: params.requisitionId,
    actorId: params.actorId,
    type: params.type,
    data: params.data ?? null,
  });
}

/**
 * Who decides. The requester may name an approver; otherwise the org's CEO
 * gets it, and where there is no CEO the request has nowhere to go.
 */
export async function resolveApprover(orgId: string, preferred?: string | null) {
  if (preferred) {
    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, preferred),
        eq(organizationMembers.orgId, orgId),
      ),
      columns: { userId: true },
    });
    if (member) return member.userId;
  }

  const ceo = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, ROLES.CEO)),
    columns: { userId: true },
  });
  return ceo?.userId ?? null;
}

/** The template already prints the ₹, so this is the number part only. */
function budgetRange(min: string | null, max: string | null): string {
  const money = (v: string) => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (min && max) return `${money(min)} – ${money(max)}`;
  if (min) return `${money(min)} and up`;
  if (max) return `up to ${money(max)}`;
  return "not stated";
}

/** The ats-requisition-approval mail. A failure here never fails the submit. */
export async function sendRequisitionApprovalEmail(requisitionId: number) {
  const row = await db
    .select({
      requisition: atsRequisitions,
      departmentName: departments.name,
      approverEmail: users.email,
    })
    .from(atsRequisitions)
    .leftJoin(departments, eq(departments.id, atsRequisitions.departmentId))
    .leftJoin(users, eq(users.id, atsRequisitions.approverId))
    .where(eq(atsRequisitions.id, requisitionId))
    .limit(1);

  const found = row[0];
  if (!found?.approverEmail) {
    logger.warn("Requisition has no approver to email", { requisitionId });
    return false;
  }

  const requester = found.requisition.createdBy
    ? await db.query.users.findFirst({
        where: eq(users.id, found.requisition.createdBy),
        columns: { name: true },
      })
    : null;

  await sendTemplateEmail("ats-requisition-approval", {
    to: found.approverEmail,
    category: "hr",
    vars: {
      requester_name: requester?.name ?? "A colleague",
      job_title: found.requisition.title,
      department: found.departmentName ?? "not set",
      openings: found.requisition.openings,
      budget_range: budgetRange(found.requisition.salaryMin, found.requisition.salaryMax),
      reason: found.requisition.justification?.trim() || "not stated",
      requisition_url: `${appUrl}/ats/requisitions/${requisitionId}`,
    },
  });
  return true;
}
