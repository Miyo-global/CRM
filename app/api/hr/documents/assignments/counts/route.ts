import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentAssignments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const rows = await db
      .select({
        documentId: documentAssignments.documentId,
        count: sql<number>`count(*)`,
      })
      .from(documentAssignments)
      .where(eq(documentAssignments.orgId, session.orgId))
      .groupBy(documentAssignments.documentId);

    const counts: Record<number, number> = {};
    for (const row of rows) {
      counts[row.documentId] = Number(row.count);
    }

    return ok(counts);
  });
}
