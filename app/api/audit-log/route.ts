import { type NextRequest } from "next/server";
import { withAdmin, ok, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, toNumber(params.get("page")) ?? 1);
    const pageSize = Math.min(100, toNumber(params.get("pageSize")) ?? 25);
    const action = params.get("action") ?? undefined;
    const targetType = params.get("targetType") ?? undefined;
    const dateFrom = params.get("dateFrom") ?? undefined;
    const dateTo = params.get("dateTo") ?? undefined;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(auditLogs.orgId, session.orgId)];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (targetType) conditions.push(eq(auditLogs.targetType, targetType));
    if (dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, end));
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
          targetId: auditLogs.targetId,
          targetType: auditLogs.targetType,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
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
