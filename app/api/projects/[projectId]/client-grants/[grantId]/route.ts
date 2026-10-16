import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectClientGrants } from "@/lib/db/schema";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const updateSchema = z.object({
  canViewMilestones: z.boolean().optional(),
  canViewTasks: z.boolean().optional(),
  canViewComments: z.boolean().optional(),
  canSubmitRequests: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; grantId: string }> };

async function scope(session: Parameters<typeof requireProjectAccess>[0], raw: { projectId: string; grantId: string }) {
  const guard = await requireProjectAccess(session, raw.projectId, "manage");
  if (!guard.ok) return guard;
  const id = parseIdParam(raw.grantId);
  if (id === null) return { ok: false as const, response: err("Access grant not found", 404) };
  return {
    ok: true as const,
    where: and(eq(projectClientGrants.id, id), eq(projectClientGrants.projectId, guard.projectId), eq(projectClientGrants.orgId, session.orgId), eq(projectClientGrants.status, "ACTIVE")),
  };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const s = await scope(session, await params);
    if (!s.ok) return s.response;
    const { expiresAt, ...caps } = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(projectClientGrants)
      .set({ ...caps, ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }), updatedAt: new Date() })
      .where(s.where)
      .returning({ id: projectClientGrants.id });
    return updated ? ok(updated) : err("Access grant not found", 404);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const s = await scope(session, await params);
    if (!s.ok) return s.response;
    const [revoked] = await db
      .update(projectClientGrants)
      .set({ status: "REVOKED", updatedAt: new Date() })
      .where(s.where)
      .returning({ id: projectClientGrants.id });
    return revoked ? ok({ revoked: true }) : err("Access grant not found", 404);
  });
}
