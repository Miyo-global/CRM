"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { expenses, organizationMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sendMonthlyExpenseReportEmail } from "@/lib/email";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import type { MonthlyExpenseReportRow } from "@/lib/email-templates";
import { EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export async function generateAndSendMonthlyExpenseReport() {
  const today = new Date();
  const lastMonthStart = startOfMonth(subMonths(today, 1));
  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const startDate = formatDateOnly(lastMonthStart);
  const endDate = formatDateOnly(lastMonthEnd);
  const monthLabel = format(lastMonthStart, "MMMM yyyy");

  const allOrgs = await db.query.organizations.findMany();
  let totalReportsSent = 0;

  for (const org of allOrgs) {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, org.id),
      with: { user: { columns: { id: true, email: true, name: true } } },
    });

    const ownerAndAdminMembers = members.filter((m) =>
      EXPENSE_ADMIN_ROLES.includes(m.role)
    );
    const recipientEmails = [
      ...new Set(
        ownerAndAdminMembers
          .map((m) => m.user?.email)
          .filter((email): email is string => !!email)
      ),
    ];

    if (recipientEmails.length === 0) continue;

    const expenseRecords = await db.query.expenses.findMany({
      where: and(
        eq(expenses.orgId, org.id),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      ),
      with: { user: { columns: { id: true, name: true, firstName: true, lastName: true, email: true } } },
      orderBy: [desc(expenses.expenseDate)],
    });

    if (expenseRecords.length === 0) continue;

    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;
    let rejectedCount = 0;
    let totalAmount = 0;

    const rows: MonthlyExpenseReportRow[] = expenseRecords.map((e) => {
      const amountNum = Number(e.amount) || 0;
      totalAmount += amountNum;
      const status = e.status ?? "PENDING";
      if (status === "PENDING") pendingCount++;
      else if (status === "APPROVED") approvedCount++;
      else if (status === "PAID") paidCount++;
      else if (status === "REJECTED") rejectedCount++;

      const employeeName =
        e.user?.firstName && e.user?.lastName
          ? `${e.user.firstName} ${e.user.lastName}`
          : e.user?.name ?? e.user?.email ?? "";

      return {
        date: new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).format(new Date(`${e.expenseDate}T12:00:00+05:30`)),
        employeeName,
        category: e.category,
        amount: amountNum.toFixed(2),
        currency: e.currency ?? "INR",
        status,
      };
    });

    const summary = {
      totalAmount: totalAmount.toFixed(2),
      totalCount: expenseRecords.length,
      pendingCount,
      approvedCount,
      paidCount,
      rejectedCount,
    };

    try {
      await sendMonthlyExpenseReportEmail(
        monthLabel,
        org.name,
        rows,
        summary,
        recipientEmails
      );
      totalReportsSent++;
    } catch (error) {
      logger.error("Failed to send monthly expense report", { orgId: org.id, error });
    }
  }

  return {
    success: true,
    message: `Sent ${totalReportsSent} monthly expense reports`,
    count: totalReportsSent,
  };
}
