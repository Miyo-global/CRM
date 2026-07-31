import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDocuments } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { documents, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { createDocumentBodySchema } from "@/lib/validations/hr-documents";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' documents.", 403);
    }

    const data = await getDocuments(session.orgId, session.user.id, isAdmin, {
      filterUserId,
      type,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    const body = await parseBody(req, createDocumentBodySchema);

    if (body.fileUrl.startsWith("http://") || body.fileUrl.startsWith("https://")) {
      const allowedOrigin = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      if (!allowedOrigin || !body.fileUrl.startsWith(`${allowedOrigin}/`)) {
        return err("File URL must point to the organization's file storage.", 400);
      }
    }

    if (body.expiryDate) {
      const expiry = new Date(`${body.expiryDate}T00:00:00.000Z`);
      if (Number.isNaN(expiry.getTime())) {
        return err("Invalid expiry date.", 400);
      }
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const maxExpiry = now + 100 * 365 * 24 * 60 * 60 * 1000;
      if (expiry.getTime() < todayStart.getTime()) {
        return err("Expiry date cannot be in the past.", 400);
      }
      if (expiry.getTime() > maxExpiry) {
        return err("Expiry date is too far in the future.", 400);
      }
    }

    const targetUserId =
      body.userId && isAdmin ? body.userId : session.user.id;

    if (targetUserId !== session.user.id) {
      const targetMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!targetMember) {
        return err("Target user not found in your organization.", 404);
      }
    }

    const [document] = await db
      .insert(documents)
      .values({
        orgId: session.orgId,
        userId: targetUserId,
        name: body.name,
        type: body.type,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        description: body.description,
        category: body.category,
        isPublic: body.isPublic ?? false,
        expiryDate: body.expiryDate,
        tags: body.tags,
        uploadedBy: session.user.id,
        isActive: true,
        version: 1,
      })
      .returning();

    void createAuditLog({
      action: "hr.document_uploaded",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(document.id),
      targetType: "document",
      metadata: { name: body.name, type: body.type, targetUserId },
    }).catch(() => {});

    return ok(document);
  });
}
