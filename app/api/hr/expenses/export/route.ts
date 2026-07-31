import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const isAdmin = isAdminOrOwner(session.user.role);

    const conditions = [eq(expenses.orgId, session.orgId)];

    if (!isAdmin) {
      conditions.push(eq(expenses.userId, session.user.id));
    }

    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
    if (status && (validStatuses as readonly string[]).includes(status)) {
      conditions.push(eq(expenses.status, status as (typeof validStatuses)[number]));
    }
    if (startDate) conditions.push(gte(expenses.expenseDate, startDate));
    if (endDate) conditions.push(lte(expenses.expenseDate, endDate));

    const data = await db
      .select({
        expenseDate: expenses.expenseDate,
        category: expenses.category,
        amount: expenses.amount,
        description: expenses.description,
        status: expenses.status,
        rejectionReason: expenses.rejectionReason,
        userName: users.name,
        userEmail: users.email,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .where(and(...conditions))
      .orderBy(expenses.expenseDate);

    const headers = ["Date", "Employee", "Email", "Category", "Amount", "Description", "Status", "Rejection Reason"];
    const rows = data.map((r) => [
      r.expenseDate,
      r.userName || "",
      r.userEmail || "",
      r.category || "",
      r.amount || "0",
      r.description || "",
      r.status || "",
      r.rejectionReason || "",
    ]);

    const csvCell = (val: unknown): string => {
      let s = String(val ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    void createAuditLog({
      action: "expense.exported",
      userId: session.user.id,
      orgId: session.orgId,
      metadata: { format: "csv", recordCount: rows.length, status, startDate, endDate },
    }).catch(() => {});

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  });
}
