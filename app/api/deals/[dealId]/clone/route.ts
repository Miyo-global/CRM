import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/constants/roles";

type Ctx = { params: Promise<{ dealId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const existing = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)),
    });

    if (!existing) return err("Deal not found", 404);

    if (!isAdminOrOwner(session.user.role) && existing.assignedToId !== session.user.id) {
      return err("You do not have permission to clone this deal", 403);
    }

    const [cloned] = await db.insert(deals).values({
      orgId: session.orgId,
      leadId: null,
      clientId: null,
      name: `${existing.name} (Copy)`,
      value: existing.value ?? "0",
      stage: "LEAD",
      probability: existing.probability ?? 0,
      contactPerson: existing.contactPerson,
      contactEmail: existing.contactEmail,
      contactPhone: existing.contactPhone,
      assignedToId: existing.assignedToId,
      notes: existing.notes,
    }).returning();

    return ok(cloned);
  });
}
