import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { fnfSettlements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { fnfHasFigures, fnfTotals } from "@/lib/hr/fnf-figures";
import type { NextRequest } from "next/server";

const amount = z.number().nonnegative("Amounts cannot be negative").optional();

const patchSchema = z.object({
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "PAID"]).optional(),
  notes: z.string().max(2000).optional(),
  // R3-SA-04: the figures of a draft (an auto-created one starts empty).
  basicDues: amount,
  leaveEncashment: amount,
  bonusDue: amount,
  deductions: amount,
  loanRecovery: amount,
});

const AMOUNT_KEYS = ["basicDues", "leaveEncashment", "bonusDue", "deductions", "loanRecovery"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fnfId: string }> }
) {
  return withAdmin(async (session) => {
    const { fnfId: id } = await params;
    const fnfId = Number(id);
    if (isNaN(fnfId)) return err("Invalid F&F settlement ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(fnfSettlements)
      .where(
        and(
          eq(fnfSettlements.id, fnfId),
          eq(fnfSettlements.orgId, session.orgId)
        )
      );

    if (!existing) return err("F&F settlement not found.", 404);

    const editsAmounts = AMOUNT_KEYS.some((k) => body[k] !== undefined);
    if (editsAmounts && existing.status !== "DRAFT") {
      return err("Figures can only be changed while the settlement is a draft.", 400);
    }

    const amounts = { ...existing };
    for (const k of AMOUNT_KEYS) if (body[k] !== undefined) amounts[k] = String(body[k]);

    if (body.status && !fnfHasFigures(amounts)) {
      return err("Enter the settlement figures before completing it.", 400);
    }

    const [updated] = await db
      .update(fnfSettlements)
      .set({
        ...(editsAmounts
          ? {
              basicDues: amounts.basicDues,
              leaveEncashment: amounts.leaveEncashment,
              bonusDue: amounts.bonusDue,
              deductions: amounts.deductions,
              loanRecovery: amounts.loanRecovery,
              netPayable: fnfTotals(amounts).net.toString(),
            }
          : {}),
        ...(body.status ? { status: body.status, approvedBy: session.user.id } : {}),
        notes: body.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(fnfSettlements.id, fnfId))
      .returning();

    return ok(updated);
  });
}
