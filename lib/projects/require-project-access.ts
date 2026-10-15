import { err } from "@/lib/api/helpers";
import { resolveProjectAccess, type ProjectAction } from "@/lib/projects/project-access";
import type { ProjectRole } from "@/lib/projects/project-roles";

type GuardSession = { user: { id: string; role?: string | null }; orgId: string };

export type ProjectGuard =
  | { ok: true; projectId: number; role: ProjectRole }
  | { ok: false; response: ReturnType<typeof err> };

export function parseIdParam(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

export async function requireProjectAccess(
  session: GuardSession,
  rawProjectId: string | undefined,
  action: ProjectAction,
): Promise<ProjectGuard> {
  const projectId = parseIdParam(rawProjectId);
  if (projectId === null) return { ok: false, response: err("Project not found", 404) };
  const decision = await resolveProjectAccess(session, projectId, action);
  if (!decision.ok) {
    const message = decision.status === 404 ? "Project not found" : "You do not have permission to do this";
    return { ok: false, response: err(message, decision.status) };
  }
  return { ok: true, projectId, role: decision.role };
}
