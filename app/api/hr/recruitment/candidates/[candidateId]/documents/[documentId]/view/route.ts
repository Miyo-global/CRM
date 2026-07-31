import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocuments, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecruitmentHr } from "@/lib/constants/roles";
import { sanitizeHtml } from "@/lib/sanitize";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ candidateId: string; documentId: string }> };


export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden: HR/Admin role required", 403);
    }

    const { candidateId, documentId } = await params;
    const candidateIdNum = Number(candidateId);
    const documentIdNum = Number(documentId);

    if (!Number.isFinite(candidateIdNum)) return err("Invalid candidate ID", 400);
    if (!Number.isFinite(documentIdNum)) return err("Invalid document ID", 400);

    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, candidateIdNum), eq(candidates.orgId, session.orgId)))
      .limit(1);

    if (!candidate) return err("Candidate not found", 404);

    const [doc] = await db
      .select({
        id: candidateDocuments.id,
        htmlContent: candidateDocuments.htmlContent,
        title: candidateDocuments.title,
        candidateId: candidateDocuments.candidateId,
        orgId: candidateDocuments.orgId,
      })
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.id, documentIdNum),
          eq(candidateDocuments.candidateId, candidateIdNum),
          eq(candidateDocuments.orgId, session.orgId)
        )
      )
      .limit(1);

    if (!doc) return err("Document not found", 404);

    void db
      .update(candidateDocuments)
      .set({ viewedAt: new Date() })
      .where(eq(candidateDocuments.id, documentIdNum))
      .then(() => undefined)
      .catch(() => undefined);

    return new NextResponse(sanitizeHtml(doc.htmlContent), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${doc.title.replace(/[^a-z0-9_-]/gi, "_")}.html"`,
        "X-Content-Type-Options": "nosniff",
      },
    }) as never;
  });
}
