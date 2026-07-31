import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const creditSchema = z.object({
  userId: z.string().min(1),
  days: z.number().positive().max(30),
  reason: z.string().optional(),
});


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!["CEO", "ADMIN", "HR", "BRANCH_HR", "BRANCH_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, creditSchema);

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, input.userId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!member) {
      return err("User is not a member of this organization", 404);
    }

    let compOffType = await db.query.leaveTypes.findFirst({
      where: and(eq(leaveTypes.orgId, session.orgId), eq(leaveTypes.name, "Compensatory Off")),
    });

    if (!compOffType) {
      const [created] = await db
        .insert(leaveTypes)
        .values({
          orgId: session.orgId,
          name: "Compensatory Off",
          daysPerYear: 30,
          carryForward: false,
        })
        .returning();
      compOffType = created;
    }

    if (!compOffType) return err("Failed to find/create comp-off leave type", 500);

    const leaveTypeId = compOffType.id;
    const year = new Date().getFullYear();

    await db.transaction(async (tx) => {
      const existing = await tx.query.leaveBalances.findFirst({
        where: and(
          eq(leaveBalances.orgId, session.orgId),
          eq(leaveBalances.userId, input.userId),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year),
        ),
      });

      if (existing) {
        const newBalance = Number(existing.balance ?? 0) + input.days;
        await tx
          .update(leaveBalances)
          .set({ balance: String(newBalance) })
          .where(eq(leaveBalances.id, existing.id));
      } else {
        await tx.insert(leaveBalances).values({
          orgId: session.orgId,
          userId: input.userId,
          leaveTypeId,
          balance: String(input.days),
          year,
        });
      }
    });

    return ok({
      success: true,
      credited: input.days,
      leaveTypeId: compOffType.id,
    });
  });
}
