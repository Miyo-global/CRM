import { withAuth, ok, err, isUniqueViolation } from "@/lib/api/helpers";
import { isAdminOrOwner, isCEO } from "@/lib/auth/helpers";
import { canManage } from "@/lib/auth/role-change-rules";
import { db } from "@/lib/db";
import { terminations, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, aliasedTable } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import {
  ensureTerminationReasonsForOrg,
  isAllowedTerminationReason,
} from "@/lib/hr/termination-reasons";
import { requireExplanationForOther, terminationFieldsSchema } from "@/lib/hr/termination-rules";
import { checkTerminationDate, terminationConflict } from "@/lib/hr/termination-guards";
import type { NextRequest } from "next/server";

const createSchema = terminationFieldsSchema
  .extend({ userId: z.string().min(1, "Employee is required") })
  .superRefine(requireExplanationForOther);

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const initiatorUser = aliasedTable(users, "initiator_user");
    const ceoReviewerUser = aliasedTable(users, "ceo_reviewer_user");

    const rows = await db
      .select({
        id: terminations.id,
        orgId: terminations.orgId,
        userId: terminations.userId,
        status: terminations.status,
        reasons: terminations.reasons,
        detailedExplanation: terminations.detailedExplanation,
        effectiveDate: terminations.effectiveDate,
        severanceAmount: terminations.severanceAmount,
        noticePeriodWaived: terminations.noticePeriodWaived,
        evidenceUrls: terminations.evidenceUrls,
        internalNotes: terminations.internalNotes,
        createdAt: terminations.createdAt,
        updatedAt: terminations.updatedAt,
        ceoRemarks: terminations.ceoRemarks,
        ceoReviewedBy: terminations.ceoReviewedBy,
        ceoReviewedAt: terminations.ceoReviewedAt,
        emailSentAt: terminations.emailSentAt,
        emailStatus: terminations.emailStatus,
        initiatedBy: terminations.initiatedBy,
        employee: {
          id: users.id,
          name: users.name,
          email: users.email,
          designation: users.designation,
          employeeId: users.employeeId,
        },
        initiator: {
          id: initiatorUser.id,
          name: initiatorUser.name,
        },
        ceoReviewer: {
          id: ceoReviewerUser.id,
          name: ceoReviewerUser.name,
        },
      })
      .from(terminations)
      .leftJoin(users, eq(terminations.userId, users.id))
      .leftJoin(initiatorUser, eq(terminations.initiatedBy, initiatorUser.id))
      .leftJoin(ceoReviewerUser, eq(terminations.ceoReviewedBy, ceoReviewerUser.id))
      .where(eq(terminations.orgId, session.orgId))
      .orderBy(desc(terminations.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or the Super Admin can initiate terminations.", 403);
    }

    const body = createSchema.parse(await req.json());

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);
    if (isCEO(membership.role)) {
      return err("The Super Admin cannot be terminated through this process.", 400);
    }
    if (body.userId === session.user.id) return err("You cannot terminate yourself.", 400);
    // R3-ADM-08: the same rank rule as role changes. Only the Super Admin
    // starts a termination for an Admin or HR account.
    if (!canManage({ userId: session.user.id, role: session.user.role }, { userId: body.userId, role: membership.role })) {
      return err("Only the Super Admin can start a termination for an Admin or HR account.", 403);
    }

    const configuredReasons = await ensureTerminationReasonsForOrg(
      session.orgId,
      session.user.id,
    );
    const invalidReason = body.reasons.find(
      (reason) => !isAllowedTerminationReason(reason, configuredReasons),
    );
    if (invalidReason) {
      return err(
        `"${invalidReason}" is not an active termination reason. Update reasons in Settings → Termination Reasons.`,
        400,
      );
    }

    // R3-ADM-02 / R3-ADM-07: sane effective date, one open termination per
    // person, nobody already terminated.
    const dateError = await checkTerminationDate(body.effectiveDate, session.user.role, body.userId);
    if (dateError) return err(dateError, 400);
    const conflict = await terminationConflict(session.orgId, body.userId);
    if (conflict) return err(conflict, 409);

    const [record] = await db
      .insert(terminations)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        reasons: body.reasons,
        detailedExplanation: body.detailedExplanation,
        effectiveDate: body.effectiveDate,
        severanceAmount: body.severanceAmount !== undefined ? body.severanceAmount.toString() : undefined,
        noticePeriodWaived: body.noticePeriodWaived,
        internalNotes: body.internalNotes,
        evidenceUrls: body.evidenceUrls && body.evidenceUrls.length > 0 ? body.evidenceUrls : null,
        status: "DRAFT",
        initiatedBy: session.user.id,
      })
      .returning()
      .catch((e: unknown) => {
        // Two saves racing past the check above meet the partial unique index.
        if (isUniqueViolation(e)) return [null];
        throw e;
      });
    if (!record) return err("This employee already has an open termination.", 409);

    void writeAuditLog({
      action: "TERMINATION_CREATED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(record.id),
      targetType: "termination",
      metadata: {
        employeeId: body.userId,
        reasons: body.reasons,
        evidenceCount: body.evidenceUrls?.length ?? 0,
      },
    }).catch(() => undefined);

    return ok(record, 201);
  });
}
