import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { terminationId: rawId } = await params;
    const terminationId = Number(rawId);
    if (!terminationId) return err("Invalid ID.", 400);

    const data = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true, initiator: true, ceoReviewer: true },
    });
    if (!data) return err("Termination not found.", 404);

    return ok(data);
  });
}
