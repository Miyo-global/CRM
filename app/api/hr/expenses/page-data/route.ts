import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, expenseCategories, expenseStatusEnum } from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
  inArray,
  like,
  or,
  asc,
  count,
} from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];

function buildConditions(
  params: URLSearchParams,
  orgId: string,
  userId: string,
  isAdmin: boolean
) {
  const conditions = [eq(expenses.orgId, orgId)];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else {
    const filterUserId = params.get("userId");
    if (filterUserId) conditions.push(eq(expenses.userId, filterUserId));
  }

  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const month = params.get("month");

  if (month) {
    const [year, mon] = month.split("-");
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    conditions.push(gte(expenses.expenseDate, `${year}-${mon}-01`));
    conditions.push(lte(expenses.expenseDate, `${year}-${mon}-${lastDay.toString().padStart(2, "0")}`));
  } else {
    if (startDate) conditions.push(gte(expenses.expenseDate, startDate));
    if (endDate) conditions.push(lte(expenses.expenseDate, endDate));
  }

  const categoryId = params.get("categoryId");
  if (categoryId) conditions.push(eq(expenses.categoryId, Number(categoryId)));

  const category = params.get("category");
  if (category) conditions.push(eq(expenses.category, category));

  const status = params.get("status");
  if (status && status !== "all" && status !== "ALL") {
    conditions.push(eq(expenses.status, status as ExpenseStatus));
  }

  const minAmount = params.get("minAmount");
  if (minAmount && Number(minAmount) > 0) {
    conditions.push(gte(sql`CAST(${expenses.amount} AS DECIMAL)`, Number(minAmount)));
  }

  const maxAmount = params.get("maxAmount");
  if (maxAmount && Number(maxAmount) > 0) {
    conditions.push(lte(sql`CAST(${expenses.amount} AS DECIMAL)`, Number(maxAmount)));
  }

  const paymentMethod = params.get("paymentMethod");
  if (paymentMethod && paymentMethod !== "all") {
    conditions.push(eq(expenses.paymentMethod, paymentMethod));
  }

  const search = params.get("search");
  if (search?.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`LOWER(${expenses.description})`, term),
        like(sql`LOWER(${expenses.category})`, term),
        like(sql`LOWER(${expenses.merchant})`, term)
      )!
    );
  }

  return conditions;
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const orgId = session.orgId;
    const userId = session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "10")));
    const sortBy = searchParams.get("sortBy") ?? "date";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";
    const offset = (page - 1) * pageSize;

    const conditions = buildConditions(searchParams, orgId, userId, isAdmin);
    const baseConditions = buildConditions(new URLSearchParams(), orgId, userId, isAdmin);

    const sortColumns = {
      date: expenses.expenseDate,
      amount: expenses.amount,
      category: expenses.category,
      status: expenses.status,
      created: expenses.createdAt,
    };
    const sortColumn = (sortColumns as Record<string, (typeof sortColumns)[keyof typeof sortColumns]>)[sortBy] ?? expenses.expenseDate;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [expenseList, countResult, statsResult, pendingList, categoryList] = await Promise.all([
      db.query.expenses.findMany({
        where: and(...conditions),
        with: { user: true, approver: true, expenseCategory: true, project: true },
        orderBy: [
          asc(sql`CASE ${expenses.status} WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'REJECTED' THEN 2 WHEN 'PAID' THEN 3 ELSE 4 END`),
          orderFn(sortColumn),
          desc(expenses.createdAt),
        ],
        limit: pageSize,
        offset,
      }),
      db.select({ count: count() }).from(expenses).where(and(...conditions)),
      db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          rejectedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'REJECTED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalCount: sql<number>`COUNT(*)`,
          pendingCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'PENDING' THEN 1 END)`,
          approvedCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'APPROVED' THEN 1 END)`,
          rejectedCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'REJECTED' THEN 1 END)`,
          paidCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'PAID' THEN 1 END)`,
        })
        .from(expenses)
        .where(and(...baseConditions)),
      isAdmin
        ? db.query.expenses.findMany({
            where: and(eq(expenses.orgId, orgId), eq(expenses.status, "PENDING")),
            with: { user: true, approver: true, expenseCategory: true, project: true },
            orderBy: [desc(expenses.createdAt)],
            limit: 100,
          })
        : Promise.resolve([]),
      db.query.expenseCategories.findMany({
        where: and(eq(expenseCategories.orgId, orgId), eq(expenseCategories.isActive, true)),
        orderBy: [expenseCategories.name],
      }),
    ]);

    const s = statsResult[0];
    const total = countResult[0]?.count ?? 0;

    return ok({
      expenses: expenseList,
      pendingExpenses: pendingList,
      stats: {
        totalAmount: Number(s?.totalAmount) || 0,
        pendingAmount: Number(s?.pendingAmount) || 0,
        approvedAmount: Number(s?.approvedAmount) || 0,
        rejectedAmount: Number(s?.rejectedAmount) || 0,
        paidAmount: Number(s?.paidAmount) || 0,
        totalCount: Number(s?.totalCount) || 0,
        pendingCount: Number(s?.pendingCount) || 0,
        approvedCount: Number(s?.approvedCount) || 0,
        rejectedCount: Number(s?.rejectedCount) || 0,
        paidCount: Number(s?.paidCount) || 0,
        avgExpenseAmount: s?.totalCount ? Number(s.totalAmount) / Number(s.totalCount) : 0,
      },
      categories: categoryList,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      isAdmin,
    });
  });
}
