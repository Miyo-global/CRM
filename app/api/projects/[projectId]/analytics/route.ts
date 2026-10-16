

import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { getProjectAnalytics } from "@/server/queries/projects";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const analytics = await getProjectAnalytics(session.orgId!, projectId);

    return ok(analytics);
  });
}
