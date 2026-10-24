import { USER_CARD } from "@/lib/db/user-card-columns";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { canManage } from "@/lib/auth/role-change-rules";
import { db } from "@/lib/db";
import { organizationMembers, terminations } from "@/lib/db/schema";
import { createAuditLog, diffFields } from "@/lib/audit-log";
import {
  EDITABLE_TERMINATION_STATUSES,
  requireExplanationForOther,
  terminationFieldsSchema,
} from "@/lib/hr/termination-rules";
import { checkTerminationDate } from "@/lib/hr/termination-guards";
import { ensureTerminationReasonsForOrg, isAllowedTerminationReason } from "@/lib/hr/termination-reasons";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { terminationId: rawId } = await params;
    const terminationId = Number(rawId);
    if (!terminationId) return err("Invalid ID.", 400);

    const data = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: USER_CARD, initiator: USER_CARD, ceoReviewer: USER_CARD },
    });
    if (!data) return err("Termination not found.", 404);

    return ok(data);
  });
}

const editSchema = terminationFieldsSchema.superRefine(requireExplanationForOther);

/** Loads a draft the caller may change, or the error response. */
async function loadOwnDraft(
  session: { orgId: string; user: { id: string; role: string } },
  rawId: string,
) {
  if (!isAdminOrOwner(session.user.role)) return { error: err("Forbidden", 403) };
  const terminationId = Number(rawId);
  if (!terminationId) return { error: err("Invalid ID.", 400) };
  const existing = await db.query.terminations.findFirst({
    where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
  });
  if (!existing) return { error: err("Termination not found.", 404) };
  if (!(EDITABLE_TERMINATION_STATUSES as readonly string[]).includes(existing.status ?? "")) {
    return { error: err("Only a draft can be edited or deleted. Cancel a submitted termination instead.", 400) };
  }
  const member = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.userId, existing.userId), eq(organizationMembers.orgId, session.orgId)),
    columns: { role: true },
  });
  if (member && !canManage({ userId: session.user.id, role: session.user.role }, { userId: existing.userId, role: member.role })) {
    return { error: err("Only the Super Admin can change a termination for an Admin or HR account.", 403) };
  }
  return { existing };
}

/** R3-ADM-07: edit a draft (all editable fields are sent). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    const { terminationId: rawId } = await params;
    const loaded = await loadOwnDraft(session, rawId);
    if (loaded.error) return loaded.error;
    const { existing } = loaded;

    const body = await parseBody(req, editSchema);
    const dateError = checkTerminationDate(body.effectiveDate, session.user.role);
    if (dateError) return err(dateError, 400);

    const configuredReasons = await ensureTerminationReasonsForOrg(session.orgId, session.user.id);
    const invalidReason = body.reasons.find((r) => !isAllowedTerminationReason(r, configuredReasons));
    if (invalidReason) return err(`"${invalidReason}" is not an active termination reason.`, 400);

    const next = {
      reasons: body.reasons,
      detailedExplanation: body.detailedExplanation,
      effectiveDate: body.effectiveDate,
      severanceAmount: body.severanceAmount !== undefined ? body.severanceAmount.toFixed(2) : null,
      noticePeriodWaived: body.noticePeriodWaived ?? false,
      internalNotes: body.internalNotes?.trim() || null,
      evidenceUrls: body.evidenceUrls && body.evidenceUrls.length > 0 ? body.evidenceUrls : null,
    };
    const before = {
      ...existing,
      severanceAmount: existing.severanceAmount != null ? Number(existing.severanceAmount).toFixed(2) : null,
      effectiveDate: String(existing.effectiveDate).slice(0, 10),
    };
    const changes = diffFields(before, next);

    if (Object.keys(changes).length > 0) {
      await db
        .update(terminations)
        .set({ ...next, updatedAt: new Date() })
        .where(and(eq(terminations.id, existing.id), eq(terminations.orgId, session.orgId)));

      void createAuditLog({
        action: "hr.termination_updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(existing.id),
        targetType: "termination",
        // Internal notes are HR-only text; record that they changed, not the text.
        metadata: {
          employeeId: existing.userId,
          changes: changes.internalNotes ? { ...changes, internalNotes: { from: "…", to: "…" } } : changes,
        },
      }).catch(() => undefined);
    }

    return ok({ success: true, changed: Object.keys(changes) });
  });
}

/** R3-ADM-07: delete a stray draft. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    const { terminationId: rawId } = await params;
    const loaded = await loadOwnDraft(session, rawId);
    if (loaded.error) return loaded.error;
    const { existing } = loaded;

    await db
      .delete(terminations)
      .where(and(eq(terminations.id, existing.id), eq(terminations.orgId, session.orgId), eq(terminations.status, "DRAFT")));

    void createAuditLog({
      action: "hr.termination_deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(existing.id),
      targetType: "termination",
      metadata: { employeeId: existing.userId, effectiveDate: existing.effectiveDate, reasons: existing.reasons },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
