import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocuments, documentTemplates, candidates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { substituteVariables } from "@/lib/utils/document-variables";
import { isRecruitmentHr } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

const generateSchema = z.object({
  templateId: z.number().int().positive("Template ID is required"),
  variables: z.record(z.string(), z.string()).default({}),
});

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { candidateId } = await params;
    const candidateIdNum = Number(candidateId);
    if (!Number.isFinite(candidateIdNum)) return err("Invalid candidate ID", 400);

    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, candidateIdNum), eq(candidates.orgId, session.orgId)))
      .limit(1);

    if (!candidate) return err("Candidate not found", 404);

    const docs = await db
      .select()
      .from(candidateDocuments)
      .where(eq(candidateDocuments.candidateId, candidateIdNum))
      .orderBy(desc(candidateDocuments.createdAt));

    return ok(docs);
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden: HR/Admin role required", 403);
    }

    const { candidateId } = await params;
    const candidateIdNum = Number(candidateId);
    if (!Number.isFinite(candidateIdNum)) return err("Invalid candidate ID", 400);

    const body = await parseBody(req, generateSchema);

    const [candidate] = await db
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName })
      .from(candidates)
      .where(and(eq(candidates.id, candidateIdNum), eq(candidates.orgId, session.orgId)))
      .limit(1);

    if (!candidate) return err("Candidate not found", 404);

    const [template] = await db
      .select()
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.id, body.templateId),
          eq(documentTemplates.orgId, session.orgId),
          eq(documentTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) return err("Template not found or inactive", 404);

    const { result, missing } = substituteVariables(template.htmlContent, body.variables);

    if (missing.length > 0) {
      return err(`Missing variable values: ${missing.join(", ")}`, 400);
    }

    const [doc] = await db
      .insert(candidateDocuments)
      .values({
        candidateId: candidateIdNum,
        orgId: session.orgId,
        templateId: body.templateId,
        title: template.title,
        htmlContent: result,
        status: "GENERATED",
        createdBy: session.user.id,
      })
      .returning();

    if (!doc) return err("Failed to generate document", 500);

    return ok(doc, 201);
  });
}
