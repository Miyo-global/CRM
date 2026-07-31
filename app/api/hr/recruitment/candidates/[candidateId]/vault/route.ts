import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocumentsVault, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const ALLOWED_EXTENSIONS = /\.(pdf|docx|doc)$/i;

const DOCUMENT_TYPES = ["AADHAR", "PAN", "PASSPORT", "CERTIFICATE", "OFFER_LETTER", "OTHER"] as const;

const addDocumentSchema = z.object({
  filename: z.string().min(1),
  s3Key: z.string().min(1),
  fileUrl: z.string().url(),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

    const docs = await db.query.candidateDocumentsVault.findMany({
      where: and(
        eq(candidateDocumentsVault.candidateId, candidateId),
        eq(candidateDocumentsVault.orgId, session.orgId)
      ),
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    });

    return ok(docs);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

    const body = await parseBody(req, addDocumentSchema);

    const mimeAllowed = ALLOWED_MIME_TYPES.has(body.fileType.toLowerCase());
    const extAllowed = ALLOWED_EXTENSIONS.test(body.filename);
    if (!mimeAllowed && !extAllowed) {
      return err("Only PDF and DOCX files are allowed for candidate documents.", 415);
    }

    const [doc] = await db
      .insert(candidateDocumentsVault)
      .values({
        candidateId,
        orgId: session.orgId,
        filename: body.filename,
        s3Key: body.s3Key,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        fileSize: body.fileSize,
        documentType: body.documentType ?? null,
        uploadedBy: session.user.id,
        avResult: "CLEAN",
      })
      .returning();

    return ok(doc, 201);
  });
}
