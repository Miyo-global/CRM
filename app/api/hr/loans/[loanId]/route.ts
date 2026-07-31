import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "ACTIVE", "REPAID", "REJECTED"]).optional(),
  paidEmis: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can manage loans.", 403);
    const { loanId: id } = await params;
    const loanId = Number(id);
    if (!loanId) return err("Invalid ID.", 400);

    const existing = await db.query.salaryLoans.findFirst({
      where: and(eq(salaryLoans.id, loanId), eq(salaryLoans.orgId, session.orgId)),
    });
    if (!existing) return err("Loan not found.", 404);

    const body = updateSchema.parse(await req.json());
    if (body.paidEmis !== undefined && body.paidEmis > (existing.totalEmis ?? 0)) {
      return err(`Paid EMIs (${body.paidEmis}) cannot exceed total EMIs (${existing.totalEmis ?? 0}).`, 400);
    }
    if (body.status) {
      const allowed: Record<string, string[]> = {
        PENDING: ["APPROVED", "REJECTED"],
        APPROVED: ["ACTIVE", "REJECTED"],
        ACTIVE: ["REPAID"],
        REPAID: [],
        REJECTED: [],
      };
      const fromStatus = existing.status ?? "PENDING";
      if (!allowed[fromStatus]?.includes(body.status)) {
        return err(`Cannot transition loan from ${fromStatus} to ${body.status}.`, 400);
      }
    }
    const autoRepaid =
      body.paidEmis !== undefined &&
      body.paidEmis >= (existing.totalEmis ?? 0) &&
      (existing.totalEmis ?? 0) > 0;

    await db.update(salaryLoans).set({
      ...(body.status && { status: body.status }),
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.status === "ACTIVE" && { disbursedAt: new Date() }),
      ...(body.paidEmis !== undefined && { paidEmis: body.paidEmis }),
      ...(autoRepaid && { status: "REPAID" as const }),
      updatedAt: new Date(),
    }).where(and(eq(salaryLoans.id, loanId), eq(salaryLoans.orgId, session.orgId)));

    return ok({ success: true });
  });
}
