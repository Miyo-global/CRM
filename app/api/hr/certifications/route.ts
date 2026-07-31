import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { certifications, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { dateOnlyOptionalSchema } from "@/lib/validations/date";

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required").max(200),
  issuingOrganization: z.string().max(200).optional(),
  issueDate: dateOnlyOptionalSchema,
  expiryDate: dateOnlyOptionalSchema,
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().url().optional().or(z.literal("")),
  documentUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId");
    const expiringSoon = req.nextUrl.searchParams.get("expiringSoon");

    if (userId && userId !== session.user.id && !isAdminOrOwner(session.user.role)) {
      return err("Not authorized to view other users' certifications.", 403);
    }

    const conditions = [eq(certifications.orgId, session.orgId)];
    if (userId) conditions.push(eq(certifications.userId, userId));

    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      conditions.push(lte(certifications.expiryDate, thirtyDaysFromNow.toISOString().split("T")[0]));
      conditions.push(gte(certifications.expiryDate, new Date().toISOString().split("T")[0]));
    }

    const data = await db.query.certifications.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(certifications.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const targetUserId = body.userId ?? session.user.id;

    if (targetUserId !== session.user.id) {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Not authorized to manage other users' certifications.", 403);
      }
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!membership) return err("Employee not found.", 404);
    }

    const [cert] = await db.insert(certifications).values({
      orgId: session.orgId,
      userId: targetUserId,
      name: body.name,
      issuingOrganization: body.issuingOrganization,
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      credentialId: body.credentialId,
      credentialUrl: body.credentialUrl || undefined,
      documentUrl: body.documentUrl || undefined,
    }).returning();
    return ok(cert, 201);
  });
}
