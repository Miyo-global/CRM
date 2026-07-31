import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes, onboardingDocuments, documentAuditLogs, departments } from "@/lib/db/schema/hr";
import { users, organizationMembers } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { z } from "zod";
import {
  onboardingDocFileNameSchema,
  onboardingDocFileRefSchema,
} from "@/lib/validations/common-forms";
import {
  documentTypesForRole,
  progressForRequiredDocs,
  requiredDocumentTypesForRole,
} from "@/lib/hr/document-type-requirements";
import type { NextRequest, NextResponse } from "next/server";

const querySchema = z.object({
  userId: z.string().optional(),
});

const createSchema = z.object({
  documentTypeId: z.number().int().positive("documentTypeId is required"),
  fileUrl: onboardingDocFileRefSchema,
  fileName: onboardingDocFileNameSchema,
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  userId: z.string().optional(),
});


export async function recalcOnboardingStatus(
  orgId: string,
  userId: string
): Promise<void> {
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.orgId, orgId)
    ),
    columns: { role: true },
  });
  const userRole = member?.role ?? null;

  const allTypes = await db
    .select({
      id: documentTypes.id,
      name: documentTypes.name,
      isMandatory: documentTypes.isMandatory,
      isActive: documentTypes.isActive,
      applicableRoles: documentTypes.applicableRoles,
      sortOrder: documentTypes.sortOrder,
    })
    .from(documentTypes)
    .where(
      and(eq(documentTypes.orgId, orgId), eq(documentTypes.isActive, true))
    );

  const requiredTypes = requiredDocumentTypesForRole(allTypes, userRole);

  if (requiredTypes.length === 0) {
    await db
      .update(users)
      .set({ onboardingDocStatus: "APPROVED", updatedAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }

  const userDocs = await db
    .select({
      documentTypeId: onboardingDocuments.documentTypeId,
      status: onboardingDocuments.status,
    })
    .from(onboardingDocuments)
    .where(
      and(
        eq(onboardingDocuments.orgId, orgId),
        eq(onboardingDocuments.userId, userId)
      )
    )
    .orderBy(desc(onboardingDocuments.id));

  const latestByType = new Map<number, string>();
  for (const doc of userDocs) {
    if (!latestByType.has(doc.documentTypeId)) {
      latestByType.set(doc.documentTypeId, doc.status ?? "SUBMITTED");
    }
  }

  const progress = progressForRequiredDocs(requiredTypes, latestByType);

  const newStatus =
    progress.derivedStatus === "APPROVED"
      ? ("APPROVED" as const)
      : progress.derivedStatus === "IN_PROGRESS"
        ? ("IN_PROGRESS" as const)
        : ("PENDING" as const);

  await db
    .update(users)
    .set({ onboardingDocStatus: newStatus, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

const reviewerUsers = aliasedTable(users, "reviewer");

export async function GET(req: NextRequest) {
  return withAuth(async (session): Promise<NextResponse<unknown>> => {
    const isAdmin =
      session.user.role === "CEO" ||
      session.user.role === "HR" ||
      session.user.role === "ADMIN";

    if (isAdmin) {
      const query = parseQuery(req, querySchema);

      if (query.userId) {
        const [employee] = await db
          .select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            employeeId: users.employeeId,
            role: organizationMembers.role,
            departmentName: departments.name,
          })
          .from(users)
          .innerJoin(
            organizationMembers,
            and(
              eq(organizationMembers.userId, users.id),
              eq(organizationMembers.orgId, session.orgId),
            ),
          )
          .leftJoin(
            departments,
            and(
              eq(users.departmentId, departments.id),
              eq(departments.orgId, session.orgId),
            ),
          )
          .where(
            and(eq(users.id, query.userId), eq(users.isActive, true)),
          )
          .limit(1);

        const allTypes = await db
          .select({
            id: documentTypes.id,
            name: documentTypes.name,
            description: documentTypes.description,
            isMandatory: documentTypes.isMandatory,
            isActive: documentTypes.isActive,
            applicableRoles: documentTypes.applicableRoles,
            sortOrder: documentTypes.sortOrder,
          })
          .from(documentTypes)
          .where(eq(documentTypes.orgId, session.orgId));

        const role = employee?.role ?? null;
        const applicableTypes = documentTypesForRole(allTypes, role);
        const requiredTypes = requiredDocumentTypesForRole(allTypes, role);

        const employeeDocRows = await db
          .select({
            id: onboardingDocuments.id,
            orgId: onboardingDocuments.orgId,
            userId: onboardingDocuments.userId,
            employeeName: users.name,
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
            eq(onboardingDocuments.documentTypeId, documentTypes.id),
          )
          .innerJoin(users, eq(onboardingDocuments.userId, users.id))
          .leftJoin(
            reviewerUsers,
            eq(onboardingDocuments.reviewedBy, reviewerUsers.id),
          )
          .where(
            and(
              eq(onboardingDocuments.orgId, session.orgId),
              eq(onboardingDocuments.userId, query.userId),
            ),
          )
          .orderBy(desc(onboardingDocuments.createdAt)) as Array<{
            id: number;
            documentTypeId: number;
            status: string | null;
            fileUrl: string;
            fileName: string;
            fileSize: number | null;
            mimeType: string | null;
            version: number | null;
            reviewedAt: Date | null;
            reviewerName: string | null;
            remarks: string | null;
            createdAt: Date | null;
          }>;

        const latestByTypeId = new Map<number, (typeof employeeDocRows)[0]>();
        for (const row of employeeDocRows) {
          if (!latestByTypeId.has(row.documentTypeId)) {
            latestByTypeId.set(row.documentTypeId, row);
          }
        }

        const latestStatusByTypeId = new Map<number, string>();
        for (const [typeId, row] of latestByTypeId) {
          latestStatusByTypeId.set(typeId, row.status ?? "SUBMITTED");
        }

        const progress = progressForRequiredDocs(requiredTypes, latestStatusByTypeId);

        const checklist = applicableTypes.map((type) => {
          const submission = latestByTypeId.get(type.id);
          return {
            documentTypeId: type.id,
            documentTypeName: type.name,
            description: type.description,
            isMandatory: type.isMandatory === true,
            sortOrder: type.sortOrder,
            submission: submission
              ? {
                  id: submission.id,
                  fileUrl: submission.fileUrl,
                  fileName: submission.fileName,
                  fileSize: submission.fileSize,
                  mimeType: submission.mimeType,
                  version: submission.version,
                  status: submission.status,
                  reviewedAt: submission.reviewedAt,
                  reviewerName: submission.reviewerName,
                  remarks: submission.remarks,
                  createdAt: submission.createdAt,
                }
              : null,
          };
        });

        return ok({
          employee: employee ?? null,
          checklist,
          progress,
          docs: employeeDocRows,
        });
      }

      const conditions = eq(onboardingDocuments.orgId, session.orgId);

      const rows = await db
        .select({
          id: onboardingDocuments.id,
          orgId: onboardingDocuments.orgId,
          userId: onboardingDocuments.userId,
          employeeName: users.name,
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
        .innerJoin(users, eq(onboardingDocuments.userId, users.id))
        .leftJoin(reviewerUsers, eq(onboardingDocuments.reviewedBy, reviewerUsers.id))
        .where(conditions)
        .orderBy(desc(onboardingDocuments.createdAt));

      return ok(rows);
    }

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
      .where(
        and(
          eq(onboardingDocuments.orgId, session.orgId),
          eq(onboardingDocuments.userId, session.user.id)
        )
      )
      .orderBy(desc(onboardingDocuments.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const docType = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, body.documentTypeId),
        eq(documentTypes.orgId, session.orgId),
        eq(documentTypes.isActive, true)
      ),
    });
    if (!docType) return err("Document type not found or inactive.", 404);

    const isHrOrCeo = session.user.role === "HR" || session.user.role === "CEO";
    const targetUserId =
      body.userId && isHrOrCeo ? body.userId : session.user.id;

    if (body.userId && body.userId !== session.user.id && !isHrOrCeo) {
      return err("Not allowed to upload documents for another user.", 403);
    }

    if (body.userId && body.userId !== session.user.id) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId),
        ),
        columns: { userId: true },
      });
      if (!member) return err("Employee not found.", 404);
    }

    const existing = await db
      .select({ id: onboardingDocuments.id, version: onboardingDocuments.version })
      .from(onboardingDocuments)
      .where(
        and(
          eq(onboardingDocuments.orgId, session.orgId),
          eq(onboardingDocuments.userId, targetUserId),
          eq(onboardingDocuments.documentTypeId, body.documentTypeId)
        )
      )
      .orderBy(desc(onboardingDocuments.version))
      .limit(1);

    const isReUpload = existing.length > 0;
    const nextVersion = isReUpload ? (existing[0].version ?? 1) + 1 : 1;
    const auditAction = isReUpload ? ("RE_UPLOADED" as const) : ("UPLOADED" as const);

    const [record] = await db
      .insert(onboardingDocuments)
      .values({
        orgId: session.orgId,
        userId: targetUserId,
        documentTypeId: body.documentTypeId,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        version: nextVersion,
        status: "SUBMITTED",
      })
      .returning();

    await db.insert(documentAuditLogs).values({
      orgId: session.orgId,
      onboardingDocumentId: record.id,
      action: auditAction,
      performedBy: session.user.id,
      metadata: { fileName: body.fileName, version: nextVersion },
    });

    await recalcOnboardingStatus(session.orgId, targetUserId);

    return ok(record, 201);
  });
}
