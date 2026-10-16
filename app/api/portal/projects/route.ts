import { and, eq, isNull } from "drizzle-orm";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectClientGrants, projects } from "@/lib/db/schema";
import { activeGrantWhere, clientPortalEnabled } from "@/lib/projects/client-access";

export async function GET() {
  return withAuth(async (session) => {
    if (!(await clientPortalEnabled(session.orgId))) return ok([]);
    const rows = await db
      .select({ id: projects.id, name: projects.name, key: projects.key, status: projects.status })
      .from(projectClientGrants)
      .innerJoin(projects, eq(projects.id, projectClientGrants.projectId))
      .where(and(activeGrantWhere(session.user.id, session.orgId), isNull(projects.deletedAt)))
      .limit(100);
    return ok(rows);
  });
}
