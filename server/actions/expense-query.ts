"use server";

import { db } from "@/lib/db";
import { expenses, expenseCategories, users, expenseStatusEnum } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, inArray, like, or, asc, count } from "drizzle-orm";
import { getAuthenticatedMember } from "@/lib/auth/helpers";
import { isAuthError } from "@/lib/auth/types";

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  month?: string;
  categoryId?: number;
  categoryIds?: number[];
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: string | string[];
  userId?: string;
  paymentMethod?: string;
  projectId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "category" | "status" | "created";
  sortOrder?: "asc" | "desc";
  includeStats?: boolean;
  includePending?: boolean;
  includeCategories?: boolean;
}

export interface ExpenseStats {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  paidAmount: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  paidCount: number;
  avgExpenseAmount: number;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  budgetLimit: string | null;
  budgetPeriod: string | null;
  isActive: boolean | null;
}

export interface ExpenseWithRelations {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string | null;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: string | null;
  approverId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  approver: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  expenseCategory: ExpenseCategory | null;
  project: {
    id: number;
    name: string;
  } | null;
}

export interface ExpensePageData {
  expenses: ExpenseWithRelations[];
  pendingExpenses: ExpenseWithRelations[];
  stats: ExpenseStats | null;
  categories: ExpenseCategory[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  appliedFilters: ExpenseFilters;
  isAdmin: boolean;
}

function buildFilterConditions(
  filters: ExpenseFilters,
  orgId: string,
  isAdmin: boolean,
  userId: string
) {
  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (filters.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }
  if (filters.startDate) {
    conditions.push(gte(expenses.expenseDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(expenses.expenseDate, filters.endDate));
  }
  if (filters.month) {
    const [year, month] = filters.month.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lte(expenses.expenseDate, endDate));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
  }
  if (filters.categoryIds?.length) {
    conditions.push(inArray(expenses.categoryId, filters.categoryIds));
  }
  if (filters.status) {
    type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 0 && !filters.status.includes("all")) {
        conditions.push(inArray(expenses.status, filters.status as ExpenseStatus[]));
      }
    } else if (filters.status !== "all") {
      conditions.push(eq(expenses.status, filters.status as ExpenseStatus));
    }
  }
  if (filters.minAmount !== undefined && filters.minAmount > 0) {
    conditions.push(gte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.minAmount));
  }
  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    conditions.push(lte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.maxAmount));
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
  }
  if (filters.projectId) {
    conditions.push(eq(expenses.projectId, filters.projectId));
  }
  if (filters.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`LOWER(${expenses.description})`, searchTerm),
        like(sql`LOWER(${expenses.category})`, searchTerm),
        like(sql`LOWER(${expenses.merchant})`, searchTerm)
      )!
    );
  }

  return conditions;
}

async function fetchExpensesWithPagination(
  conditions: ReturnType<typeof buildFilterConditions>,
  page: number,
  pageSize: number,
  sortBy: string = "date",
  sortOrder: string = "desc"
) {
  const offset = (page - 1) * pageSize;
  const sortColumn = {
    date: expenses.expenseDate,
    amount: expenses.amount,
    category: expenses.category,
    status: expenses.status,
    created: expenses.createdAt,
  }[sortBy] || expenses.expenseDate;

  const orderFn = sortOrder === "asc" ? asc : desc;

  const [expenseList, countResult] = await Promise.all([
    db.query.expenses.findMany({
      where: and(...conditions),
      with: {
        user: true,
        approver: true,
        expenseCategory: true,
        project: true,
      },
      orderBy: [

        asc(sql`CASE ${expenses.status} WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'REJECTED' THEN 2 WHEN 'PAID' THEN 3 ELSE 4 END`),
        orderFn(sortColumn),
        desc(expenses.createdAt),
      ],
      limit: pageSize,
      offset: offset,
    }),
    db
      .select({ count: count() })
      .from(expenses)
      .where(and(...conditions)),
  ]);

  return {
    expenses: expenseList as ExpenseWithRelations[],
    total: countResult[0]?.count || 0,
  };
}

async function fetchAggregatedStats(
  conditions: ReturnType<typeof buildFilterConditions>
): Promise<ExpenseStats> {
  const result = await db
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
    .where(and(...conditions));

  const stats = result[0];
  return {
    totalAmount: Number(stats?.totalAmount) || 0,
    pendingAmount: Number(stats?.pendingAmount) || 0,
    approvedAmount: Number(stats?.approvedAmount) || 0,
    rejectedAmount: Number(stats?.rejectedAmount) || 0,
    paidAmount: Number(stats?.paidAmount) || 0,
    totalCount: Number(stats?.totalCount) || 0,
    pendingCount: Number(stats?.pendingCount) || 0,
    approvedCount: Number(stats?.approvedCount) || 0,
    rejectedCount: Number(stats?.rejectedCount) || 0,
    paidCount: Number(stats?.paidCount) || 0,
    avgExpenseAmount: stats?.totalCount ? Number(stats.totalAmount) / Number(stats.totalCount) : 0,
  };
}

async function fetchPendingExpenses(orgId: string): Promise<ExpenseWithRelations[]> {
  return (await db.query.expenses.findMany({
    where: and(
      eq(expenses.orgId, orgId),
      eq(expenses.status, "PENDING")
    ),
    with: {
      user: true,
      approver: true,
      expenseCategory: true,
      project: true,
    },
    orderBy: [desc(expenses.createdAt)],
  })) as ExpenseWithRelations[];
}

async function fetchCategories(orgId: string): Promise<ExpenseCategory[]> {
  return await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, orgId),
      eq(expenseCategories.isActive, true)
    ),
    orderBy: [expenseCategories.name],
  }) as ExpenseCategory[];
}

export async function getExpensePageData(
  filters: ExpenseFilters = {}
): Promise<ExpensePageData | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const conditions = buildFilterConditions(filters, orgId, isAdmin, userId);
  const [expenseData, statsData, categoriesData, pendingData] = await Promise.all([
    fetchExpensesWithPagination(
      conditions,
      page,
      pageSize,
      filters.sortBy,
      filters.sortOrder
    ),
    filters.includeStats !== false
      ? fetchAggregatedStats(buildFilterConditions({}, orgId, isAdmin, userId))
      : null,
    filters.includeCategories !== false ? fetchCategories(orgId) : [],
    isAdmin && filters.includePending !== false
      ? fetchPendingExpenses(orgId)
      : [],
  ]);

  return {
    expenses: expenseData.expenses,
    pendingExpenses: pendingData,
    stats: statsData,
    categories: categoriesData,
    pagination: {
      page,
      pageSize,
      total: expenseData.total,
      totalPages: Math.ceil(expenseData.total / pageSize),
    },
    appliedFilters: filters,
    isAdmin,
  };
}

export async function getExpensesForExport(
  filters: ExpenseFilters = {}
): Promise<{ expenses: ExpenseWithRelations[]; stats: ExpenseStats } | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;
  const conditions = buildFilterConditions(filters, orgId, isAdmin, userId);

  const [expenseList, stats] = await Promise.all([
    db.query.expenses.findMany({
      where: and(...conditions),
      with: {
        user: true,
        approver: true,
        expenseCategory: true,
        project: true,
      },
      orderBy: [desc(expenses.expenseDate)],
    }),
    fetchAggregatedStats(conditions),
  ]);

  return {
    expenses: expenseList as ExpenseWithRelations[],
    stats,
  };
}

export interface CategorySpending {
  categoryId: number;
  categoryName: string;
  budgetLimit: number;
  budgetPeriod: string;
  totalSpent: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  expenseCount: number;
}

export async function getCategorySpendingOptimized(): Promise<CategorySpending[] | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  if (!authResult.isAdmin) {
    return { error: "Permission denied" };
  }

  const { orgId } = authResult;
  const categories = await db.query.expenseCategories.findMany({
    where: and(
      eq(expenseCategories.orgId, orgId),
      eq(expenseCategories.isActive, true)
    ),
  });

  if (categories.length === 0) {
    return [];
  }
  const spendingData = await db
    .select({
      category: expenses.category,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('APPROVED', 'PAID') THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      expenseCount: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .where(eq(expenses.orgId, orgId))
    .groupBy(expenses.category);
  const spendingMap = new Map(spendingData.map((s) => [s.category, s]));

  return categories.map((cat) => {
    const spending = spendingMap.get(cat.name);
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      budgetLimit: parseFloat(cat.budgetLimit || "0"),
      budgetPeriod: cat.budgetPeriod || "MONTHLY",
      totalSpent: Number(spending?.totalSpent) || 0,
      pendingAmount: Number(spending?.pendingAmount) || 0,
      approvedAmount: Number(spending?.approvedAmount) || 0,
      paidAmount: Number(spending?.paidAmount) || 0,
      expenseCount: Number(spending?.expenseCount) || 0,
    };
  });
}

export interface ReportData {
  summary: ExpenseStats;
  byCategory: {
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  byEmployee: {
    userId: string;
    userName: string;
    count: number;
    amount: number;
  }[];
  byMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  byStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  topExpenses: {
    id: number;
    category: string;
    amount: number;
    description: string;
    userName: string;
    expenseDate: string;
    status: string;
  }[];
}

export async function getExpenseReportDataOptimized(
  filters: { startDate: string; endDate: string }
): Promise<ReportData | { error: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;

  const conditions = [
    eq(expenses.orgId, orgId),
    gte(expenses.expenseDate, filters.startDate),
    lte(expenses.expenseDate, filters.endDate),
  ];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  }
  const [summary, byCategory, byEmployee, byMonth, byStatus, topExpenses] = await Promise.all([
    fetchAggregatedStats(conditions),
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
      : [],
    db
      .select({
        month: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
        monthSort: sql<string>`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`,
        count: sql<number>`COUNT(*)`,
        amount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(
        sql`TO_CHAR(${expenses.expenseDate}::date, 'Mon YYYY')`,
        sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`
      )
      .orderBy(asc(sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM')`)),
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
      where: and(
        ...conditions,
        or(eq(expenses.status, "APPROVED"), eq(expenses.status, "PAID"))
      ),
      with: { user: true },
      orderBy: [desc(sql`CAST(${expenses.amount} AS DECIMAL)`)],
      limit: 10,
    }),
  ]);

  const totalAmount = summary.totalAmount || 1;

  return {
    summary,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: Number(c.count),
      amount: Number(c.amount),
      percentage: (Number(c.amount) / totalAmount) * 100,
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
      amount: parseFloat(e.amount),
      description: e.description || "",
      userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
      expenseDate: e.expenseDate,
      status: e.status || "PENDING",
    })),
  };
}
