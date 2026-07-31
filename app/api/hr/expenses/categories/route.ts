import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, expenseCategories } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const cats = await db.query.expenseCategories.findMany({
      where: and(eq(expenseCategories.orgId, session.orgId), eq(expenseCategories.isActive, true)),
      orderBy: [expenseCategories.name],
    });

    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = `${now.getFullYear()}-${m}-01`;

    const spending = await db
      .select({
        categoryId: expenses.categoryId,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('APPROVED', 'PAID') THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
        pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
        approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(and(eq(expenses.orgId, session.orgId), gte(expenses.expenseDate, monthStart)))
      .groupBy(expenses.categoryId);

    const spendingMap = new Map(spending.map((s) => [s.categoryId, s]));

    return ok(
      cats.map((cat) => {
        const s = spendingMap.get(cat.id);
        return {
          ...cat,
          totalSpent: Number(s?.totalSpent) || 0,
          pendingAmount: Number(s?.pendingAmount) || 0,
          approvedAmount: Number(s?.approvedAmount) || 0,
          expenseCount: Number(s?.expenseCount) || 0,
        };
      })
    );
  });
}

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  budgetLimit: z.number().positive().optional(),
  budgetPeriod: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create expense categories.", 403);
    }

    const body = await parseBody(req, createCategorySchema);

    const existing = await db.query.expenseCategories.findFirst({
      where: and(
        eq(expenseCategories.orgId, session.orgId),
        eq(expenseCategories.isActive, true),
        sql`LOWER(${expenseCategories.name}) = LOWER(${body.name})`
      ),
    });
    if (existing) {
      return err("A category with this name already exists.", 409);
    }

    const [category] = await db
      .insert(expenseCategories)
      .values({
        orgId: session.orgId,
        name: body.name,
        description: body.description,
        budgetLimit: body.budgetLimit?.toString(),
        budgetPeriod: body.budgetPeriod,
      })
      .returning();

    return ok(category);
  });
}
