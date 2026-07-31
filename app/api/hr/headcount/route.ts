import { withAdmin, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, departments } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  groupBy: z.enum(["department", "role", "branch"]).default("department"),
});

export interface HeadcountGroup {
  label: string;
  count: number;
}

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return err("Invalid groupBy value. Use: department | role | branch", 400);
    }

    const { groupBy } = parsed.data;
    const orgId = session.orgId;

    let groups: HeadcountGroup[] = [];

    if (groupBy === "department") {
      const rows = await db
        .select({
          departmentId: users.departmentId,
          count: count(),
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.departmentId);

      const allDepts = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.orgId, orgId));
      const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

      groups = rows.map((r) => ({
        label: r.departmentId ? (deptMap.get(r.departmentId) ?? "Other") : "Unassigned",
        count: Number(r.count),
      }));
    } else if (groupBy === "role") {
      const rows = await db
        .select({
          role: users.role,
          count: count(),
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.role);

      groups = rows.map((r) => ({
        label: r.role,
        count: Number(r.count),
      }));
    } else {
      const rows = await db
        .select({
          branchId: users.branchId,
          count: count(),
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
        .groupBy(users.branchId);

      groups = rows.map((r) => ({
        label: r.branchId ? `Branch ${r.branchId}` : "Head Office",
        count: Number(r.count),
      }));
    }

    groups.sort((a, b) => b.count - a.count);

    return ok(groups);
  });
}
