import { USER_CARD } from "@/lib/db/user-card-columns";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner, isCEO } from "@/lib/auth/helpers";
import { notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { resignations, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendResignationSubmittedEmail } from "@/lib/email";
import { after } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { format, parseISO } from "date-fns";
import type { NextRequest } from "next/server";
import { isoDateInTimezone } from "@/lib/constants/locale";

import { RESIGNATION_REASONS } from "@/lib/constants/hr-separation";

const REASON_CATEGORIES = [...RESIGNATION_REASONS] as const;

const createSchema = z
  .object({
    reason: z.string().min(50, "Detailed reason must be at least 50 characters").max(2000),
    reasonCategory: z.enum(REASON_CATEGORIES),
    reasonCategoryOther: z.string().trim().max(200).optional(),
    lastWorkingDate: z
      .string()
      .min(1, "Last working date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Last working date must be YYYY-MM-DD"),
    noticePeriodDays: z.number().int().min(0).max(180).optional().default(30),
    willingForExitInterview: z.boolean().optional().default(true),
    companyFeedback: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reasonCategory === "Other" && !data.reasonCategoryOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify your reason when selecting Other",
        path: ["reasonCategoryOther"],
      });
    }
    // A requested last working day must fall inside the notice period (R2-EMP-04).
    const today = isoDateInTimezone();
    const [y, m, d] = today.split("-").map(Number);
    const latest = new Date(Date.UTC(y, m - 1, d + data.noticePeriodDays)).toISOString().slice(0, 10);
    if (data.lastWorkingDate <= today || data.lastWorkingDate > latest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Last working date must be after today and no later than ${latest}`,
        path: ["lastWorkingDate"],
      });
    }
  });

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(resignations.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(resignations.userId, session.user.id));

    const data = await db.query.resignations.findMany({
      where: and(...conditions),
      with: { user: USER_CARD, checklists: true, hrReviewer: USER_CARD, ceoReviewer: USER_CARD },
      orderBy: [desc(resignations.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    // The CEO cannot resign through the employee exit flow.
    if (isCEO(session.user.role)) {
      return err("Resignation submission is not available for the CEO role.", 403);
    }

    const body = createSchema.parse(await req.json());

    // Prevent duplicate active exit requests for the same employee.
    const existingActive = await db
      .select({ id: resignations.id })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, session.orgId),
          eq(resignations.userId, session.user.id),
          notInArray(resignations.status, ["WITHDRAWN", "REJECTED", "COMPLETED"]),
        ),
      )
      .limit(1);
    if (existingActive.length > 0) {
      return err("You already have an active exit request in progress.", 409);
    }

    const [resignation] = await db.insert(resignations).values({
      orgId: session.orgId,
      userId: session.user.id,
      reason: body.reason,
      reasonCategory:
        body.reasonCategory === "Other" && body.reasonCategoryOther
          ? `Other: ${body.reasonCategoryOther}`
          : body.reasonCategory,
      lastWorkingDate: body.lastWorkingDate,
      noticePeriodDays: body.noticePeriodDays,
      willingForExitInterview: body.willingForExitInterview,
      companyFeedback: body.companyFeedback || null,
      status: "PENDING_HR",
    }).returning();

    void createAuditLog({
      action: "hr.resignation_submitted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(resignation.id),
      targetType: "resignation",
      metadata: { lastWorkingDate: body.lastWorkingDate, noticePeriodDays: body.noticePeriodDays },
    }).catch(() => undefined);

    const adminMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, session.orgId),
        inArray(organizationMembers.role, ["CEO", "HR"])
      ),
      with: { user: USER_CARD },
    });

    const submittingUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    const submissionDate = format(new Date(), "dd MMM yyyy");
    const lastWorkingDate = format(parseISO(body.lastWorkingDate), "dd MMM yyyy");

    // after(): an un-awaited send can be cut off once the response is sent
    // on serverless (R3-0009).
    after(async () => {
    for (const admin of adminMembers) {
      if (admin.user?.email && admin.user.email !== submittingUser?.email) {
        await sendResignationSubmittedEmail(admin.user.email, {
          employeeName: submittingUser?.name ?? "Employee",
          employeeCode: submittingUser?.employeeId,
          department: submittingUser?.designation,
          lastWorkingDay: lastWorkingDate,
          noticePeriodDays: body.noticePeriodDays,
          reason: body.reason,
          resignationId: resignation.id,
        }).catch(() => undefined);
      }
    }
    });

    return ok(resignation, 201);
  });
}
