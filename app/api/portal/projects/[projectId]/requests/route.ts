import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { intakeItems } from "@/lib/db/schema";
import { parseIdParam } from "@/lib/projects/require-project-access";
import { resolveClientGrant } from "@/lib/projects/client-access";

const requestSchema = z.object({
  title: z.string().trim().min(1, "Give the request a title").max(200),
  description: z.string().max(5000).optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const projectId = parseIdParam((await params).projectId);
    const grant = projectId === null ? null : await resolveClientGrant(session.user.id, session.orgId, projectId);
    if (!grant || projectId === null) return err("Project not found", 404);
    if (!grant.canSubmitRequests) return err("You can view this project but not send requests", 403);

    const body = await parseBody(req, requestSchema);
    const [item] = await db
      .insert(intakeItems)
      .values({
        orgId: session.orgId,
        projectId,
        title: body.title,
        description: body.description ?? null,
        source: "manual",
        submitterEmail: session.user.email ?? null,
      })
      .returning({ id: intakeItems.id });
    return ok(item, 201);
  });
}
