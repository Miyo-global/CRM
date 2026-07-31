import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const VALID_STAGES = ["upcoming", "in_discussion", "renewed", "churned"] as const;

const updateRenewalSchema = z.object({
  renewalStage: z.enum(VALID_STAGES).optional(),
  renewalDate: z.string().nullable().optional(),
  renewalNotes: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ accountId: string }> };


export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { accountId: id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) return err("Invalid account id", 400);

  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CUSTOMER_SUPPORT", "HR", "CEO", "SALES"].includes(role)) {
      return err("Insufficient permissions to update renewal stage", 403);
    }

    const input = await parseBody(req, updateRenewalSchema);

    const existing = await db.query.clientAccounts.findFirst({
      where: and(eq(clientAccounts.id, accountId), eq(clientAccounts.orgId, session.orgId)),
    });
    if (!existing) return err("Client account not found", 404);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.renewalStage !== undefined) updateData.renewalStage = input.renewalStage;
    if (input.renewalDate !== undefined) updateData.renewalDate = input.renewalDate;
    if (input.renewalNotes !== undefined) updateData.renewalNotes = input.renewalNotes;

    const [updated] = await db
      .update(clientAccounts)
      .set(updateData)
      .where(and(eq(clientAccounts.id, accountId), eq(clientAccounts.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}
