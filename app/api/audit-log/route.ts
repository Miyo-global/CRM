import { type NextRequest } from "next/server";
import { withAdmin, ok, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lt, or, ilike, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { addDaysToDateString, isDateOnly, zonedDayStartUtc } from "@/lib/date-utils";

// The user an event is about, so "User #<id>" can show a name and Emp ID.
const targetUsers = alias(users, "target_users");

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, toNumber(params.get("page")) ?? 1);
    const pageSize = Math.min(100, toNumber(params.get("pageSize")) ?? 25);
    const action = params.get("action") ?? undefined;
    const targetType = params.get("targetType") ?? undefined;
    const dateFrom = params.get("dateFrom") ?? undefined;
    const dateTo = params.get("dateTo") ?? undefined;
    const q = params.get("q")?.trim().slice(0, 200) || undefined;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(auditLogs.orgId, session.orgId)];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (targetType) conditions.push(eq(auditLogs.targetType, targetType));
    // From/To are calendar days in the org timezone, not the server's (R3 follow-up).
    if (dateFrom && isDateOnly(dateFrom)) conditions.push(gte(auditLogs.createdAt, zonedDayStartUtc(dateFrom)));
    if (dateTo && isDateOnly(dateTo)) {
      conditions.push(lt(auditLogs.createdAt, zonedDayStartUtc(addDaysToDateString(dateTo, 1))));
    }

    // R3-ADM-09: free-text search over actor, action, entity and metadata.
    if (q) {
      const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
      const pattern = `%${escaped}%`;
      // "leave approved" (the shown label) also finds the code hr.leave_approved.
      const actionPattern = `%${escaped.replace(/\s+/g, "\\_")}%`;
      conditions.push(
        or(
          ilike(users.name, pattern),
          ilike(users.email, pattern),
          ilike(auditLogs.action, actionPattern),
          ilike(auditLogs.targetType, pattern),
          ilike(auditLogs.targetId, pattern),
          sql`${auditLogs.metadata}::text ILIKE ${pattern}`,
        )!,
      );
    }

    const where = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
          userEmployeeId: users.employeeId,
          targetId: auditLogs.targetId,
          targetType: auditLogs.targetType,
          targetName: targetUsers.name,
          targetEmployeeId: targetUsers.employeeId,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(targetUsers, and(inArray(auditLogs.targetType, ["user", "employee"]), eq(auditLogs.targetId, targetUsers.id)))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where),
    ]);

    return ok({
      logs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / pageSize),
    });
  });
}
