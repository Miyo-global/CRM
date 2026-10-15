import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const tokenSchema = z.object({ enabled: z.boolean() }).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const { enabled } = await parseBody(req, tokenSchema);
    const intakeToken = enabled ? nanoid(24) : null;
    await db.update(projects).set({ intakeToken }).where(eq(projects.id, guard.projectId));
    return ok({ intakeToken });
  });
}
