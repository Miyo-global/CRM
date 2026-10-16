import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuth, ok } from "@/lib/api/helpers";
import { ticketActivity } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { loadActivityPage, pageParams } from "@/lib/projects/activity-feed";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const scope = and(eq(ticketActivity.projectId, guard.projectId), eq(ticketActivity.orgId, session.orgId))!;
    return ok(await loadActivityPage(scope, pageParams(req.nextUrl.searchParams)));
  });
}
