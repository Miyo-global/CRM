import { withAuth, err, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const record = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!record) return err("Not found.", 404);

    const isAdmin = session.user.role === "CEO" || session.user.role === "HR";
    if (!isAdmin && record.userId !== session.user.id) {
      return err("Access denied.", 403);
    }

    type StepStatus = "completed" | "active" | "pending" | "rejected";
    const steps: { label: string; status: StepStatus; actor?: string; timestamp?: string; remarks?: string }[] = [];

    const isRejected = record.status === "REJECTED";
    const isWithdrawn = record.status === "WITHDRAWN";

    steps.push({
      label: "Submitted",
      status: "completed",
      timestamp: record.createdAt ? format(new Date(record.createdAt), "dd MMM yyyy, HH:mm") : undefined,
    });

    if (record.hrReviewedAt) {
      const hrUser = record.hrReviewedBy
        ? await db.query.users.findFirst({ where: eq(users.id, record.hrReviewedBy) })
        : null;
      steps.push({
        label: "HR Review",
        status: record.status === "REJECTED" && !record.ceoReviewedAt ? "rejected" : "completed",
        actor: hrUser?.name ?? "HR",
        timestamp: format(new Date(record.hrReviewedAt), "dd MMM yyyy, HH:mm"),
        remarks: record.hrRemarks ?? undefined,
      });
    } else if (record.status === "PENDING_HR" || record.status === "SUBMITTED") {
      steps.push({ label: "HR Review", status: "active" });
    } else {
      steps.push({ label: "HR Review", status: "pending" });
    }

    if (record.ceoReviewedAt) {
      const ceoUser = record.ceoReviewedBy
        ? await db.query.users.findFirst({ where: eq(users.id, record.ceoReviewedBy) })
        : null;
      steps.push({
        label: "CEO Approval",
        status: record.status === "REJECTED" ? "rejected" : "completed",
        actor: ceoUser?.name ?? "CEO",
        timestamp: format(new Date(record.ceoReviewedAt), "dd MMM yyyy, HH:mm"),
        remarks: record.ceoRemarks ?? undefined,
      });
    } else if (record.status === "HR_APPROVED") {
      steps.push({ label: "CEO Approval", status: "active" });
    } else {
      steps.push({ label: "CEO Approval", status: "pending" });
    }

    steps.push({
      label: "Exit Process",
      status: record.status === "IN_PROGRESS" || record.status === "COMPLETED" ? "completed" : "pending",
    });

    steps.push({
      label: "Completed",
      status: record.status === "COMPLETED" ? "completed" : "pending",
    });

    return ok({
      id: record.id,
      status: record.status,
      isRejected,
      isWithdrawn,
      steps,
      lastWorkingDate: record.lastWorkingDate,
      reasonCategory: record.reasonCategory,
    });
  });
}
