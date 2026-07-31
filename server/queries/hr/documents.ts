"server-only";

import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import type { Document } from "@/types/hr";

export async function getDocuments(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    type?: string;
  }
): Promise<Document[]> {
  const conditions = [
    eq(documents.orgId, orgId),
    eq(documents.isActive, true),
  ];

  if (params?.filterUserId) {
    conditions.push(eq(documents.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(
      or(
        eq(documents.userId, userId),
        eq(documents.isPublic, true),
        eq(documents.uploadedBy, userId),
      )!,
    );
  }

  if (params?.type) {
    conditions.push(eq(documents.type, params.type as import("@/types/hr").DocumentType));
  }

  return db.query.documents.findMany({
    where: and(...conditions),
    orderBy: [desc(documents.createdAt)],
  }) as unknown as Promise<Document[]>;
}
