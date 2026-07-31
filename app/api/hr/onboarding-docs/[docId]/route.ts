import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes, onboardingDocuments, documentAuditLogs } from "@/lib/db/schema/hr";
import { users } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { recalcOnboardingStatus } from "../route";

type Params = { params: Promise<{ docId: string }> };

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RE_UPLOAD_REQUESTED"]),
  remarks: z.string().optional(),
});

const reviewerUsers = aliasedTable(users, "reviewer");

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { docId: rawId } = await params;
    const docId = Number(rawId);
    if (!Number.isFinite(docId)) return err("Invalid document ID.", 400);

    const isAdmin =
      session.user.role === "CEO" ||
      session.user.role === "HR" ||
      session.user.role === "ADMIN";

    const whereConditions = isAdmin
      ? and(
          eq(onboardingDocuments.id, docId),
          eq(onboardingDocuments.orgId, session.orgId)
        )
      : and(
          eq(onboardingDocuments.id, docId),
          eq(onboardingDocuments.orgId, session.orgId),
          eq(onboardingDocuments.userId, session.user.id)
        );

    const rows = await db
      .select({
        id: onboardingDocuments.id,
        orgId: onboardingDocuments.orgId,
        userId: onboardingDocuments.userId,
        documentTypeId: onboardingDocuments.documentTypeId,
        documentTypeName: documentTypes.name,
        isMandatory: documentTypes.isMandatory,
        fileUrl: onboardingDocuments.fileUrl,
        fileName: onboardingDocuments.fileName,
        fileSize: onboardingDocuments.fileSize,
        mimeType: onboardingDocuments.mimeType,
        version: onboardingDocuments.version,
        status: onboardingDocuments.status,
        reviewedBy: onboardingDocuments.reviewedBy,
        reviewedAt: onboardingDocuments.reviewedAt,
        remarks: onboardingDocuments.remarks,
        createdAt: onboardingDocuments.createdAt,
        updatedAt: onboardingDocuments.updatedAt,
        reviewerName: reviewerUsers.name,
      })
      .from(onboardingDocuments)
      .innerJoin(
        documentTypes,
        eq(onboardingDocuments.documentTypeId, documentTypes.id)
      )
      .leftJoin(reviewerUsers, eq(onboardingDocuments.reviewedBy, reviewerUsers.id))
      .where(whereConditions)
      .limit(1);

    if (rows.length === 0) return err("Document not found.", 404);

    const doc = rows[0];

    const auditRows = await db
      .select({
        id: documentAuditLogs.id,
        action: documentAuditLogs.action,
        performedBy: documentAuditLogs.performedBy,
        performedByName: users.name,
        remarks: documentAuditLogs.remarks,
        metadata: documentAuditLogs.metadata,
        createdAt: documentAuditLogs.createdAt,
      })
      .from(documentAuditLogs)
      .innerJoin(users, eq(documentAuditLogs.performedBy, users.id))
      .where(eq(documentAuditLogs.onboardingDocumentId, docId))
      .orderBy(desc(documentAuditLogs.createdAt));

    return ok({ ...doc, auditLogs: auditRows });
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { docId: rawId } = await params;
    const docId = Number(rawId);
    if (!Number.isFinite(docId)) return err("Invalid document ID.", 400);

    const body = await parseBody(req, reviewSchema);

    const existing = await db.query.onboardingDocuments.findFirst({
      where: and(
        eq(onboardingDocuments.id, docId),
        eq(onboardingDocuments.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Document not found.", 404);

    const actionMap = {
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      RE_UPLOAD_REQUESTED: "RE_UPLOAD_REQUESTED",
    } as const;

    const [updated] = await db
      .update(onboardingDocuments)
      .set({
        status: body.status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        remarks: body.remarks,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(onboardingDocuments.id, docId),
          eq(onboardingDocuments.orgId, session.orgId)
        )
      )
      .returning();

    await db.insert(documentAuditLogs).values({
      orgId: session.orgId,
      onboardingDocumentId: docId,
      action: actionMap[body.status],
      performedBy: session.user.id,
      remarks: body.remarks,
      metadata: { previousStatus: existing.status },
    });

    await recalcOnboardingStatus(session.orgId, existing.userId);

    return ok(updated);
  });
}
