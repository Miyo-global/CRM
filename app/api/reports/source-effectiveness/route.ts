import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export interface SourceEffectivenessRow {
  source: string;
  total: number;
  hired: number;
  rejected: number;
  hireRate: number;
}

const REPORT_ROLES = new Set(["CEO", "HR", "ADMIN", "BRANCH_HR"]);

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !REPORT_ROLES.has(role)) {
      return err("Forbidden", 403);
    }

    const rows = await db
      .select({
        source: sql<string>`COALESCE(${candidates.source}, 'DIRECT')`,
        total: sql<number>`COUNT(*)::int`,
        hired: sql<number>`COUNT(*) FILTER (WHERE ${candidates.status} = 'HIRED')::int`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${candidates.status} = 'REJECTED')::int`,
      })
      .from(candidates)
      .where(eq(candidates.orgId, session.orgId))
      .groupBy(sql`COALESCE(${candidates.source}, 'DIRECT')`)
      .orderBy(sql`COUNT(*) DESC`);

    const data: SourceEffectivenessRow[] = rows.map((r) => ({
      source: r.source,
      total: r.total,
      hired: r.hired,
      rejected: r.rejected,
      hireRate: r.total > 0 ? Math.round((r.hired / r.total) * 100) : 0,
    }));

    return ok(data);
  });
}
