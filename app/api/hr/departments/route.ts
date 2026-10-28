import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDepartments } from "@/server/queries/hr";
import {
  countMembersByDepartment,
  departmentNameTaken,
  isOrgMember,
} from "@/server/queries/hr/department-membership";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { rejectDuplicateSubmit } from "@/lib/api/submit-guard";

const postDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  managerId: z.string().min(1).nullish(),
});

export async function GET() {
  return withAuth(async (session) => {
    const [data, counts] = await Promise.all([
      getDepartments(session.orgId),
      countMembersByDepartment(session.orgId),
    ]);
    return ok(data.map((d) => ({ ...d, memberCount: counts.get(d.id) ?? 0 })));
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

    if (await departmentNameTaken(session.orgId, body.name)) {
      return err("A department with this name already exists.", 409);
    }
    if (body.managerId && !(await isOrgMember(session.orgId, body.managerId))) {
      return err("Department head must be a member of this organization.", 400);
    }

    await db.insert(departments).values({
      name: body.name,
      managerId: body.managerId ?? null,
      orgId: session.orgId,
    });

    return ok({ success: true });
  });
}
