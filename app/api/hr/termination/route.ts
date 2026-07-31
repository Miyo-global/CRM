import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner, isCEO } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, aliasedTable } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import {
  ensureTerminationReasonsForOrg,
  isAllowedTerminationReason,
} from "@/lib/hr/termination-reasons";
import { OTHER_TERMINATION_REASON } from "@/lib/constants/hr-separation";
import type { NextRequest } from "next/server";

const createSchema = z
  .object({
    userId: z.string().min(1, "Employee is required"),
    reasons: z.array(z.string().min(1)).min(1, "At least one reason is required"),
    detailedExplanation: z.string().min(1, "Detailed explanation is required"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date is required"),
    severanceAmount: z.number().nonnegative().optional(),
    noticePeriodWaived: z.boolean().optional().default(false),
    internalNotes: z.string().optional(),
    evidenceUrls: z.array(z.string().url()).max(20, "Too many evidence files").optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.reasons.includes(OTHER_TERMINATION_REASON) &&
      data.detailedExplanation.trim().length < 50
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailedExplanation"],
        message:
          "A detailed explanation (min 50 characters) is required when 'Other' is selected.",
      });
    }
  });

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
      return err("Only HR or CEO can initiate terminations.", 403);
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
      return err("The CEO cannot be terminated through this process.", 400);
    }
    if (body.userId === session.user.id) return err("You cannot terminate yourself.", 400);

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
      .returning();

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
