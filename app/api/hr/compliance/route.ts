import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { policyAcknowledgments, documents } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const sendAckSchema = z.object({
  documentId: z.number().int().positive(),
  userIds: z.array(z.string().min(1)).min(1, "At least one user required"),
});

const ackSchema = z.object({
  acknowledgmentId: z.number().int().positive(),
  status: z.enum(["ACKNOWLEDGED", "DECLINED"]),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(policyAcknowledgments.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(policyAcknowledgments.userId, session.user.id));

    const data = await db.query.policyAcknowledgments.findMany({
      where: and(...conditions),
      with: { document: true, user: true },
      orderBy: [desc(policyAcknowledgments.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can send acknowledgment requests.", 403);
    const body = sendAckSchema.parse(await req.json());

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, body.documentId), eq(documents.orgId, session.orgId)),
    });
    if (!doc) return err("Document not found.", 404);

    const values = body.userIds.map((userId) => ({
      orgId: session.orgId,
      documentId: body.documentId,
      userId,
      status: "PENDING" as const,
    }));

    await db.insert(policyAcknowledgments).values(values);
    return ok({ success: true, sent: values.length }, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const body = ackSchema.parse(await req.json());

    const existing = await db.query.policyAcknowledgments.findFirst({
      where: and(
        eq(policyAcknowledgments.id, body.acknowledgmentId),
        eq(policyAcknowledgments.userId, session.user.id)
      ),
    });
    if (!existing) return err("Acknowledgment not found.", 404);

    await db.update(policyAcknowledgments).set({
      status: body.status,
      acknowledgedAt: new Date(),
    }).where(eq(policyAcknowledgments.id, body.acknowledgmentId));

    return ok({ success: true });
  });
}
