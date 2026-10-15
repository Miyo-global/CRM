import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectClientGrants, projects } from "@/lib/db/schema";
import { getOrgFeatureFlags } from "@/lib/org-features";

export type ClientGrant = {
  id: number;
  projectId: number;
  canViewMilestones: boolean;
  canViewTasks: boolean;
  canViewComments: boolean;
  canSubmitRequests: boolean;
};

export function activeGrantWhere(userId: string, orgId: string) {
  return and(
    eq(projectClientGrants.userId, userId),
    eq(projectClientGrants.orgId, orgId),
    eq(projectClientGrants.status, "ACTIVE"),
    or(isNull(projectClientGrants.expiresAt), gt(projectClientGrants.expiresAt, new Date())),
  );
}

export async function clientPortalEnabled(orgId: string): Promise<boolean> {
  return (await getOrgFeatureFlags(orgId)).clientPortal;
}

export async function resolveClientGrant(userId: string, orgId: string, projectId: number): Promise<ClientGrant | null> {
  if (!(await clientPortalEnabled(orgId))) return null;
  const [row] = await db
    .select({
      id: projectClientGrants.id,
      projectId: projectClientGrants.projectId,
      canViewMilestones: projectClientGrants.canViewMilestones,
      canViewTasks: projectClientGrants.canViewTasks,
      canViewComments: projectClientGrants.canViewComments,
      canSubmitRequests: projectClientGrants.canSubmitRequests,
    })
    .from(projectClientGrants)
    .innerJoin(projects, eq(projects.id, projectClientGrants.projectId))
    .where(and(activeGrantWhere(userId, orgId), eq(projectClientGrants.projectId, projectId), isNull(projects.deletedAt)))
    .limit(1);
  return row ?? null;
}
