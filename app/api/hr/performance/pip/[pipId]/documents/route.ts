import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans, pipDocuments } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createPIPDocumentSchema } from "@/lib/validations/hr-pip";
import type { NextRequest } from "next/server";

async function canAccessPip(
  session: { orgId: string; user: { id: string; role: string } },
  pip: { orgId: string; userId: string; managerId: string; hrRepId: string | null; mentorId: string | null }
): Promise<boolean> {
  if (pip.orgId !== session.orgId) return false;
  if (isAdminOrOwner(session.user.role) || session.user.role === "ADMIN") return true;
  if (
    pip.userId === session.user.id ||
    pip.managerId === session.user.id ||
    pip.hrRepId === session.user.id ||
    pip.mentorId === session.user.id
  )
    return true;
  return isManagerOf(session.user.id, pip.userId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const pip = await db.query.performanceImprovementPlans.findFirst({
      where: and(
        eq(performanceImprovementPlans.id, pipId),
        eq(performanceImprovementPlans.orgId, session.orgId)
      ),
    });
    if (!pip) return err("Not found.", 404);
    if (!(await canAccessPip(session, pip))) return err("Forbidden.", 403);

    const docs = await db.query.pipDocuments.findMany({
      where: and(eq(pipDocuments.pipId, pipId), eq(pipDocuments.orgId, session.orgId)),
      with: { uploader: { columns: { id: true, name: true } } },
      orderBy: [asc(pipDocuments.createdAt)],
    });
    return ok(docs);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const pip = await db.query.performanceImprovementPlans.findFirst({
      where: and(
        eq(performanceImprovementPlans.id, pipId),
        eq(performanceImprovementPlans.orgId, session.orgId)
      ),
    });
    if (!pip) return err("Not found.", 404);

    const canWrite =
      isAdminOrOwner(session.user.role) ||
      session.user.role === "ADMIN" ||
      pip.managerId === session.user.id ||
      pip.hrRepId === session.user.id ||
      (await isManagerOf(session.user.id, pip.userId));
    if (!canWrite) return err("Only manager or HR can add documents.", 403);

    const body = await parseBody(req, createPIPDocumentSchema);

    const [doc] = await db
      .insert(pipDocuments)
      .values({
        pipId,
        orgId: session.orgId,
        docType: body.docType,
        title: body.title,
        content: body.content,
        uploadedBy: session.user.id,
      })
      .returning();

    return ok(doc, 201);
  });
}
