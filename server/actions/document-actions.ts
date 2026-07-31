"use server";

import { db } from "@/lib/db";
import { documents, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, or, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { ensureOrgMembership, isAdminOrOwner } from "@/lib/auth/helpers";

type DocumentType = "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "PAYSLIP" | "POLICY" | "OFFER_LETTER" | "RESUME" | "OTHER";

interface CreateDocumentInput {
  name: string;
  description?: string;
  type: DocumentType;
  category?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  departmentId?: number;
  isPublic?: boolean;
  expiryDate?: string;
  tags?: string[];
}

export async function uploadDocument(data: CreateDocumentInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await ensureOrgMembership(session.user.id, session.user.role);
  if (!membership) return { error: "No organization found" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  const isAdmin = isAdminOrOwner(member.role);
  const targetUserId = (data.userId && isAdmin) ? data.userId : session.user.id;

  try {
    const [document] = await db.insert(documents).values({
      orgId: member.orgId,
      userId: targetUserId,
      departmentId: data.departmentId,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      isPublic: data.isPublic || false,
      expiryDate: data.expiryDate,
      tags: data.tags,
      uploadedBy: session.user.id,
      version: 1,
    }).returning();

    revalidatePath("/hr/documents");
    return { success: true, document };
  } catch (error) {
    logger.error("Failed to upload document", error);
    return { error: "Failed to upload document" };
  }
}

export async function getDocuments(filters?: {
  userId?: string;
  type?: DocumentType;
  category?: string;
  search?: string;
  includeExpired?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  const isAdmin = isAdminOrOwner(member.role);
  const conditions = [
    eq(documents.orgId, member.orgId),
    eq(documents.isActive, true),
  ];

  if (!isAdmin) {
    conditions.push(
      or(
        eq(documents.userId, session.user.id),
        eq(documents.isPublic, true),
        eq(documents.uploadedBy, session.user.id)
      )!
    );
  } else if (filters?.userId) {
    conditions.push(eq(documents.userId, filters.userId));
  }

  if (filters?.type) {
    conditions.push(eq(documents.type, filters.type));
  }

  if (filters?.category) {
    conditions.push(eq(documents.category, filters.category));
  }

  return await db.query.documents.findMany({
    where: and(...conditions),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getMyDocuments() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  return await db.query.documents.findMany({
    where: and(
      eq(documents.orgId, member.orgId),
      eq(documents.userId, session.user.id),
      eq(documents.isActive, true)
    ),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getEmployeeDocuments(employeeId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  const isAdmin = isAdminOrOwner(member.role);
  const isOwn = employeeId === session.user.id;

  if (!isAdmin && !isOwn) return [];

  return await db.query.documents.findMany({
    where: and(
      eq(documents.orgId, member.orgId),
      eq(documents.userId, employeeId),
      eq(documents.isActive, true)
    ),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getCompanyPolicies() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  return await db.query.documents.findMany({
    where: and(
      eq(documents.orgId, member.orgId),
      eq(documents.type, "POLICY"),
      eq(documents.isActive, true),
      eq(documents.isPublic, true)
    ),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getPublicDocuments(limit: number = 6) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  return await db.query.documents.findMany({
    where: and(
      eq(documents.orgId, member.orgId),
      eq(documents.isActive, true),
      eq(documents.isPublic, true)
    ),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [desc(documents.createdAt)],
    limit,
  });
}

export async function getExpiringDocuments(daysAhead: number = 30) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || !isAdminOrOwner(member.role)) {
    return [];
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return await db.query.documents.findMany({
    where: and(
      eq(documents.orgId, member.orgId),
      eq(documents.isActive, true),
      lte(documents.expiryDate, futureDate.toISOString().split('T')[0])
    ),
    with: {
      user: true,
      uploader: true,
    },
    orderBy: [documents.expiryDate],
  });
}

export async function updateDocument(documentId: number, data: Partial<CreateDocumentInput>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return { error: "Permission denied" };

  const existingDoc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.orgId, member.orgId)
    ),
  });

  if (!existingDoc) return { error: "Document not found" };

  const isAdmin = isAdminOrOwner(member.role);
  const isUploader = existingDoc.uploadedBy === session.user.id;

  if (!isAdmin && !isUploader) {
    return { error: "Permission denied" };
  }

  try {
    await db.update(documents)
      .set({
        name: data.name,
        description: data.description,
        category: data.category,
        isPublic: data.isPublic,
        expiryDate: data.expiryDate,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    revalidatePath("/hr/documents");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update document", error);
    return { error: "Failed to update document" };
  }
}

export async function uploadNewVersion(documentId: number, data: {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return { error: "Permission denied" };

  const existingDoc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.orgId, member.orgId)
    ),
  });

  if (!existingDoc) return { error: "Document not found" };

  try {
    await db.update(documents)
      .set({ isActive: false })
      .where(eq(documents.id, documentId));

    const [newDoc] = await db.insert(documents).values({
      orgId: member.orgId,
      userId: existingDoc.userId,
      departmentId: existingDoc.departmentId,
      name: existingDoc.name,
      description: existingDoc.description,
      type: existingDoc.type,
      category: existingDoc.category,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      isPublic: existingDoc.isPublic,
      expiryDate: existingDoc.expiryDate,
      tags: existingDoc.tags,
      uploadedBy: session.user.id,
      version: (existingDoc.version || 1) + 1,
      parentDocumentId: documentId,
    }).returning();

    revalidatePath("/hr/documents");
    return { success: true, document: newDoc };
  } catch (error) {
    logger.error("Failed to upload new version", error);
    return { error: "Failed to upload new version" };
  }
}

export async function deleteDocument(documentId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return { error: "Permission denied" };

  const existingDoc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.orgId, member.orgId)
    ),
  });

  if (!existingDoc) return { error: "Document not found" };

  const isAdmin = isAdminOrOwner(member.role);
  const isUploader = existingDoc.uploadedBy === session.user.id;

  if (!isAdmin && !isUploader) {
    return { error: "Permission denied" };
  }

  try {
    await db.update(documents)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    revalidatePath("/hr/documents");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete document", error);
    return { error: "Failed to delete document" };
  }
}

export async function getDocumentStats() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return null;

  const isAdmin = isAdminOrOwner(member.role);
  const conditions = [
    eq(documents.orgId, member.orgId),
    eq(documents.isActive, true),
  ];

  if (!isAdmin) {
    conditions.push(eq(documents.userId, session.user.id));
  }

  const allDocs = await db.query.documents.findMany({
    where: and(...conditions),
  });

  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const thirtyDaysLater = futureDate.toISOString().split('T')[0];

  const expiringCount = allDocs.filter(d =>
    d.expiryDate && d.expiryDate <= thirtyDaysLater && d.expiryDate >= today
  ).length;

  const expiredCount = allDocs.filter(d =>
    d.expiryDate && d.expiryDate < today
  ).length;

  const byType = allDocs.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCount: allDocs.length,
    expiringCount,
    expiredCount,
    byType,
  };
}

