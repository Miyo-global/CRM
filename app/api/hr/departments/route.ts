import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDepartments } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectDuplicateSubmit } from "@/lib/api/submit-guard";

const postDepartmentSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getDepartments(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can create departments.", 403);
    }

    const body = await parseBody(req, postDepartmentSchema);
    const dup = await rejectDuplicateSubmit("department", session.user.id, body);
    if (dup) return dup;

    const name = body.name.trim();
    const existing = await db.query.departments.findFirst({
      where: and(eq(departments.orgId, session.orgId), sql`lower(${departments.name}) = ${name.toLowerCase()}`),
      columns: { id: true },
    });
    if (existing) return err("A department with this name already exists.", 409);

    await db.insert(departments).values({
      name: body.name.trim(),
      orgId: session.orgId,
    });

    return ok({ success: true });
  });
}
