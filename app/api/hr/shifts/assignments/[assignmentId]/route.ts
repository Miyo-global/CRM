import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { shiftAssignments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  return withAdmin(async (session) => {
    const id = Number((await params).assignmentId);
    if (!Number.isInteger(id) || id <= 0) return err("Invalid assignment ID.", 400);
    const [deleted] = await db
      .delete(shiftAssignments)
      .where(and(eq(shiftAssignments.id, id), eq(shiftAssignments.orgId, session.orgId)))
      .returning({ id: shiftAssignments.id });
    if (!deleted) return err("Assignment not found.", 404);
    return ok({ success: true });
  });
}
