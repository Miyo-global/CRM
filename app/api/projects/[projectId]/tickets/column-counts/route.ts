import { NextRequest } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const rows = await db
      .select({ status: tickets.status, n: count() })
      .from(tickets)
      .where(and(eq(tickets.projectId, guard.projectId), eq(tickets.orgId, session.orgId), isNull(tickets.deletedAt)))
      .groupBy(tickets.status);

    return ok(Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])));
  });
}
