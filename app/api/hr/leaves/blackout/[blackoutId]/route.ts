import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBlackoutDates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ blackoutId: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAdmin(async (session) => {
    const { blackoutId: bid } = await params;
    const id = Number(bid);
    if (!Number.isFinite(id)) return err("Invalid ID", 400);

    const existing = await db.query.leaveBlackoutDates.findFirst({
      where: and(
        eq(leaveBlackoutDates.id, id),
        eq(leaveBlackoutDates.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!existing) return err("Blackout date not found", 404);

    await db.delete(leaveBlackoutDates).where(eq(leaveBlackoutDates.id, id));

    return ok({ success: true });
  });
}
