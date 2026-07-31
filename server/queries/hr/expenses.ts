"server-only";

import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type { Expense } from "@/types/hr";

export async function getExpenses(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (params?.filterUserId) {
    conditions.push(eq(expenses.userId, params.filterUserId));
  }
  if (params?.status) conditions.push(eq(expenses.status, params.status));
  if (params?.startDate) conditions.push(gte(expenses.expenseDate, params.startDate));
  if (params?.endDate) conditions.push(lte(expenses.expenseDate, params.endDate));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const data = await db.query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.expenseDate)],
    limit,
    offset,
  });

  return {
    data: data as unknown as Expense[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
