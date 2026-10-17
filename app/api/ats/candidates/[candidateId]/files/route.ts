import type { NextRequest } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocuments, candidates } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { validateMagicBytes } from "@/lib/files/magic-bytes";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** MIYO-0647: a candidate's extra files, each behind a signed link. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    const { allowed } = await atsPageAccess({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (!allowed) return err("Not found.", 404);

    const rows = await db
      .select({
        id: candidateDocuments.id,
        fileName: candidateDocuments.fileName,
        fileKey: candidateDocuments.fileKey,
        fileSize: candidateDocuments.fileSize,
        createdAt: candidateDocuments.createdAt,
      })
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.candidateId, candidateId),
          eq(candidateDocuments.orgId, session.orgId),
          isNotNull(candidateDocuments.fileKey),
        ),
      )
      .orderBy(desc(candidateDocuments.createdAt));

    return ok(
      await Promise.all(
        rows.map(async (row) => ({
          ...row,
          url: row.fileKey ? await getFileUrl(row.fileKey, 900) : null,
        })),
      ),
    );
  }, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    const { allowed } = await atsPageAccess({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (!allowed) return err("Not found.", 404);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) return err("Choose a file.", 400);
    if (file.size > MAX_BYTES) return err("Files must be under 10MB.", 400);
    if (!ALLOWED.has(file.type)) return err("PDF, Word or an image, please.", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, file.type)) {
      return err("That file is not what its name says it is.", 400);
    }

    const upload = await uploadFile(
      buffer,
      "candidate-files",
      file.name,
      file.type,
      session.orgId,
    );

    const [saved] = await db
      .insert(candidateDocuments)
      .values({
        candidateId,
        orgId: session.orgId,
        title: file.name,
        status: "UPLOADED",
        fileKey: upload.key,
        fileName: file.name,
        fileSize: buffer.length,
        createdBy: session.user.id,
      })
      .returning({ id: candidateDocuments.id });

    return ok(saved, 201);
  }, req);
}
