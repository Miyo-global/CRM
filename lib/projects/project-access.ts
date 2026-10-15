import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { normalizeProjectRole, type ProjectRole } from "@/lib/projects/project-roles";

export type ProjectAction = "view" | "contribute" | "manage";

const ACTION_ROLES: Record<ProjectAction, readonly ProjectRole[]> = {
  view: ["OWNER", "MANAGER", "CONTRIBUTOR", "VIEWER"],
  contribute: ["OWNER", "MANAGER", "CONTRIBUTOR"],
  manage: ["OWNER", "MANAGER"],
};

type AccessInput = {
  sessionOrgId: string;
  userId: string;
  orgRole: string | null | undefined;
  project: { orgId: string; managerId: string | null; deletedAt: Date | null } | null;
  memberRole: string | null | undefined;
  isMember: boolean;
};

export type AccessDecision =
  | { ok: true; role: ProjectRole }
  | { ok: false; status: 403 | 404 };

export function decideProjectAccess(input: AccessInput, action: ProjectAction): AccessDecision {
  const { project } = input;
  if (!project || project.deletedAt || project.orgId !== input.sessionOrgId) {
    return { ok: false, status: 404 };
  }

  let role: ProjectRole | null = null;
  if (isAdminOrOwner(input.orgRole)) role = "OWNER";
  else if (project.managerId && project.managerId === input.userId) role = "MANAGER";
  else if (input.isMember) role = normalizeProjectRole(input.memberRole);

  if (!role) return { ok: false, status: 404 };
  if (!ACTION_ROLES[action].includes(role)) return { ok: false, status: 403 };
  return { ok: true, role };
}

type AccessSession = { user: { id: string; role?: string | null }; orgId: string };

export async function resolveProjectAccess(
  session: AccessSession,
  projectId: number,
  action: ProjectAction,
): Promise<AccessDecision> {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) return { ok: false, status: 404 };

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId), isNull(projects.deletedAt)),
    columns: { orgId: true, managerId: true, deletedAt: true },
  });

  const member = project
    ? await db.query.projectMembers.findFirst({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)),
        columns: { role: true },
      })
    : undefined;

  return decideProjectAccess(
    {
      sessionOrgId: session.orgId,
      userId: session.user.id,
      orgRole: session.user.role,
      project: project ?? null,
      memberRole: member?.role,
      isMember: !!member,
    },
    action,
  );
}
