import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { resignations, exitChecklists, users, fnfSettlements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendResignationApprovedEmail } from "@/lib/email";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum([
    "SUBMITTED", "PENDING_HR", "HR_APPROVED", "CEO_APPROVED",
    "IN_PROGRESS", "APPROVED", "WITHDRAWN", "COMPLETED", "REJECTED",
  ]).optional(),
  remarks: z.string().max(2000).optional(),
  exitInterviewNotes: z.string().max(5000).optional(),
  exitInterviewDate: z.string().optional(),
  feedback: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  checklistItems: z.array(z.string().min(1)).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const data = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
      with: { user: true, checklists: true, hrReviewer: true, ceoReviewer: true },
    });
    if (!data) return err("Resignation not found.", 404);

    if (!isAdminOrOwner(session.user.role) && data.userId !== session.user.id) {
      return err("Forbidden", 403);
    }

    const progress = buildProgressTimeline(data);

    return ok({ ...data, progress });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const existing = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!existing) return err("Resignation not found.", 404);

    const body = updateSchema.parse(await req.json());
    const role = session.user.role;

    if (body.status === "HR_APPROVED") {
      if (role !== "HR" && role !== "CEO") return err("Only HR can perform HR review.", 403);
      if (existing.status !== "PENDING_HR" && existing.status !== "SUBMITTED") {
        return err("Resignation is not pending HR review.", 400);
      }
      await db.update(resignations).set({
        status: "HR_APPROVED",
        hrReviewedBy: session.user.id,
        hrReviewedAt: new Date(),
        hrRemarks: body.remarks || null,
        updatedAt: new Date(),
      }).where(eq(resignations.id, resignationId));

      return ok({ success: true });
    }

    if (body.status === "CEO_APPROVED") {
      if (role !== "CEO") return err("Only CEO can approve at this stage.", 403);
      if (existing.status !== "HR_APPROVED") {
        return err("Resignation must be HR-approved first.", 400);
      }
      await db.update(resignations).set({
        status: "CEO_APPROVED",
        ceoReviewedBy: session.user.id,
        ceoReviewedAt: new Date(),
        ceoRemarks: body.remarks || null,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(resignations.id, resignationId));

      await db.insert(fnfSettlements).values({
        orgId: session.orgId,
        userId: existing.userId,
        resignationId,
        status: "DRAFT",
      }).onConflictDoNothing();

      const employee = await db.query.users.findFirst({
        where: eq(users.id, existing.userId),
      });
      if (employee?.email) {
        const lwd = existing.lastWorkingDate ? new Date(existing.lastWorkingDate) : new Date();
        const sub = existing.createdAt ?? new Date();
        sendResignationApprovedEmail(
          employee.email,
          employee.name ?? "Employee",
          session.user.name ?? "CEO",
          format(lwd, "dd MMM yyyy"),
          existing.noticePeriodDays ?? 30,
          format(sub, "dd MMM yyyy")
        ).catch(() => undefined);
      }

      return ok({ success: true });
    }

    if (body.status === "REJECTED") {
      if (!isAdminOrOwner(role)) return err("Only admins can reject.", 403);
      if (!body.remarks) return err("Remarks are required when rejecting.", 400);

      const updateFields: Record<string, unknown> = {
        status: "REJECTED",
        updatedAt: new Date(),
      };
      if (role === "HR") {
        updateFields.hrReviewedBy = session.user.id;
        updateFields.hrReviewedAt = new Date();
        updateFields.hrRemarks = body.remarks;
      } else {
        updateFields.ceoReviewedBy = session.user.id;
        updateFields.ceoReviewedAt = new Date();
        updateFields.ceoRemarks = body.remarks;
      }

      await db.update(resignations).set(updateFields).where(eq(resignations.id, resignationId));
      return ok({ success: true });
    }

    if (body.status === "WITHDRAWN") {
      if (existing.userId !== session.user.id) return err("Only the employee can withdraw.", 403);
      if (existing.status === "CEO_APPROVED" || existing.status === "COMPLETED" || existing.status === "IN_PROGRESS") {
        return err("Cannot withdraw after CEO approval.", 400);
      }
      await db.update(resignations).set({
        status: "WITHDRAWN",
        updatedAt: new Date(),
      }).where(eq(resignations.id, resignationId));
      return ok({ success: true });
    }

    if (body.status === "COMPLETED") {
      if (!isAdminOrOwner(role)) return err("Only admins can complete.", 403);
      await db.update(resignations).set({
        status: "COMPLETED",
        updatedAt: new Date(),
      }).where(eq(resignations.id, resignationId));
      return ok({ success: true });
    }

    await db.update(resignations).set({
      ...(body.exitInterviewNotes && { exitInterviewNotes: body.exitInterviewNotes }),
      ...(body.exitInterviewDate && { exitInterviewDate: new Date(body.exitInterviewDate), exitInterviewConductedBy: session.user.id }),
      ...(body.feedback && { feedback: body.feedback }),
      updatedAt: new Date(),
    }).where(eq(resignations.id, resignationId));

    if (body.checklistItems?.length) {
      await db.insert(exitChecklists).values(
        body.checklistItems.map((item) => ({
          resignationId,
          item,
          status: "PENDING" as const,
        }))
      );
    }

    return ok({ success: true });
  });
}

function buildProgressTimeline(resignation: Record<string, unknown>) {
  const steps = [
    {
      label: "Submitted",
      status: "completed" as const,
      actor: null,
      timestamp: resignation.createdAt as string | null,
      remarks: null,
    },
    {
      label: "HR Review",
      status: getStepStatus(resignation, "HR"),
      actor: (resignation.hrReviewer as { name?: string } | null)?.name ?? null,
      timestamp: resignation.hrReviewedAt as string | null,
      remarks: resignation.hrRemarks as string | null,
    },
    {
      label: "CEO Review",
      status: getStepStatus(resignation, "CEO"),
      actor: (resignation.ceoReviewer as { name?: string } | null)?.name ?? null,
      timestamp: resignation.ceoReviewedAt as string | null,
      remarks: resignation.ceoRemarks as string | null,
    },
    {
      label: "Exit Process",
      status: ["IN_PROGRESS", "COMPLETED"].includes(resignation.status as string) ? "completed" as const : "pending" as const,
      actor: null,
      timestamp: null,
      remarks: null,
    },
    {
      label: "Completed",
      status: resignation.status === "COMPLETED" ? "completed" as const : "pending" as const,
      actor: null,
      timestamp: null,
      remarks: null,
    },
  ];
  return steps;
}

function getStepStatus(
  resignation: Record<string, unknown>,
  reviewer: "HR" | "CEO"
): "completed" | "active" | "rejected" | "pending" {
  const status = resignation.status as string;
  if (status === "REJECTED") {
    if (reviewer === "HR" && resignation.hrReviewedAt && !resignation.ceoReviewedAt) return "rejected";
    if (reviewer === "CEO" && resignation.ceoReviewedAt) return "rejected";
  }
  if (reviewer === "HR") {
    if (["HR_APPROVED", "CEO_APPROVED", "IN_PROGRESS", "COMPLETED"].includes(status)) return "completed";
    if (["PENDING_HR", "SUBMITTED"].includes(status)) return "active";
  }
  if (reviewer === "CEO") {
    if (["CEO_APPROVED", "IN_PROGRESS", "COMPLETED"].includes(status)) return "completed";
    if (status === "HR_APPROVED") return "active";
  }
  return "pending";
}
