import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return err("startDate and endDate are required.", 400);
    }

    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [
      eq(expenses.orgId, session.orgId),
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate),
    ];

    if (!isAdmin) conditions.push(eq(expenses.userId, session.user.id));

    const [allExpenses, byCategory, byMonth, byStatus, topExpenses, byEmployee] = await Promise.all([
      db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
          approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('APPROVED','PAID') THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          rejectedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'REJECTED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalExpenses: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(and(...conditions)),
      db
        .select({
          category: expenses.category,
          count: sql<number>`COUNT(*)`,
          amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
        })
        .from(expenses)
        .where(and(...conditions))
        .groupBy(expenses.category)
        .orderBy(desc(sql`SUM(CAST(${expenses.amount} AS DECIMAL))`)),
      db
        .select({
          month: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
          count: sql<number>`COUNT(*)`,
          amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
        })
        .from(expenses)
        .where(and(...conditions))
        .groupBy(sql`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`, sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`),
      db
        .select({
          status: expenses.status,
          count: sql<number>`COUNT(*)`,
          amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
        })
        .from(expenses)
        .where(and(...conditions))
        .groupBy(expenses.status),
      db.query.expenses.findMany({
        where: and(...conditions, or(eq(expenses.status, "APPROVED"), eq(expenses.status, "PAID"))),
        with: { user: true },
        orderBy: [desc(sql`CAST(${expenses.amount} AS DECIMAL)`)],
        limit: 10,
      }),
      isAdmin
        ? db
            .select({
              userId: expenses.userId,
              firstName: users.firstName,
              lastName: users.lastName,
              count: sql<number>`COUNT(*)`,
              amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
            })
            .from(expenses)
            .leftJoin(users, eq(expenses.userId, users.id))
            .where(and(...conditions))
            .groupBy(expenses.userId, users.firstName, users.lastName)
            .orderBy(desc(sql`SUM(CAST(${expenses.amount} AS DECIMAL))`))
        : Promise.resolve([]),
    ]);

    const summary = allExpenses[0];
    const totalAmount = Number(summary?.totalAmount) || 0;

    return ok({
      summary: {
        totalExpenses: Number(summary?.totalExpenses) || 0,
        totalAmount,
        approvedAmount: Number(summary?.approvedAmount) || 0,
        rejectedAmount: Number(summary?.rejectedAmount) || 0,
        pendingAmount: Number(summary?.pendingAmount) || 0,
        avgExpenseAmount: summary?.totalExpenses ? totalAmount / Number(summary.totalExpenses) : 0,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: Number(c.count),
        amount: Number(c.amount),
        percentage: totalAmount > 0 ? (Number(c.amount) / totalAmount) * 100 : 0,
      })),
      byEmployee: (byEmployee as { userId: string | null; firstName: string | null; lastName: string | null; count: number; amount: number }[]).map((e) => ({
        userId: e.userId || "",
        userName: `${e.firstName || ""} ${e.lastName || ""}`.trim() || "Unknown",
        count: Number(e.count),
        amount: Number(e.amount),
      })),
      byMonth: byMonth.map((m) => ({
        month: m.month,
        count: Number(m.count),
        amount: Number(m.amount),
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status || "PENDING",
        count: Number(s.count),
        amount: Number(s.amount),
      })),
      topExpenses: topExpenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: parseFloat(e.amount || "0"),
        description: e.description || "",
        userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
        expenseDate: e.expenseDate,
      })),
    });
  });
}
