import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents, documentAssignments, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignBodySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(500),
});

const unassignQuerySchema = z.object({
  userIds: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .refine((arr) => arr.length > 0, "At least one user id is required."),
});

async function loadDocument(documentId: number, orgId: string) {
  return db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.orgId, orgId)),
    columns: { id: true, userId: true, name: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await loadDocument(documentId, session.orgId);
    if (!doc) return err("Document not found.", 404);

    const rows = await db
      .select({
        id: documentAssignments.id,
        userId: documentAssignments.userId,
        assignedById: documentAssignments.assignedById,
        createdAt: documentAssignments.createdAt,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(documentAssignments)
      .innerJoin(users, eq(documentAssignments.userId, users.id))
      .where(
        and(
          eq(documentAssignments.documentId, documentId),
          eq(documentAssignments.orgId, session.orgId),
        ),
      );

    return ok(rows);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await loadDocument(documentId, session.orgId);
    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isOwner && !isAdmin) {
      return err("Not authorized to share this document.", 403);
    }

    const body = await parseBody(req, assignBodySchema);
    const uniqueUserIds = Array.from(new Set(body.userIds));

    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          inArray(organizationMembers.userId, uniqueUserIds),
        ),
      );
    const validUserIds = members.map((m) => m.userId);

    if (validUserIds.length === 0) {
      return err("No valid employees found in your organization.", 400);
    }

    await db
      .insert(documentAssignments)
      .values(
        validUserIds.map((userId) => ({
          orgId: session.orgId,
          documentId,
          userId,
          assignedById: session.user.id,
        })),
      )
      .onConflictDoNothing({
        target: [documentAssignments.documentId, documentAssignments.userId],
      });

    return ok({ success: true, assigned: validUserIds.length });
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await loadDocument(documentId, session.orgId);
    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isOwner && !isAdmin) {
      return err("Not authorized to modify sharing for this document.", 403);
    }

    const { searchParams } = req.nextUrl;
    const parsed = unassignQuerySchema.safeParse({
      userIds: searchParams.get("userIds") ?? "",
    });
    if (!parsed.success) {
      return err("At least one employee must be specified.", 400);
    }

    await db
      .delete(documentAssignments)
      .where(
        and(
          eq(documentAssignments.documentId, documentId),
          eq(documentAssignments.orgId, session.orgId),
          inArray(documentAssignments.userId, parsed.data.userIds),
        ),
      );

    return ok({ success: true });
  });
}
