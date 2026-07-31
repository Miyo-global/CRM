import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { socialMetrics } from "@/lib/db/schema/marketing";
import { and, eq } from "drizzle-orm";


export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ metricId: string }> }
) {
  return withAuth(async (session) => {
    const { metricId } = await params;
    const id = Number(metricId);
    if (!id || isNaN(id)) return err("Invalid metric ID", 400);

    const [deleted] = await db
      .delete(socialMetrics)
      .where(and(eq(socialMetrics.id, id), eq(socialMetrics.orgId, session.orgId)))
      .returning({ id: socialMetrics.id });

    if (!deleted) return err("Metric not found", 404);

    return ok({ success: true });
  });
}
