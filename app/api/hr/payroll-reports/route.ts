import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAdmin<unknown>(async (session) => {
    const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
    const reportType = req.nextUrl.searchParams.get("type") || "summary";

    const yearStart = `${year}-01`;
    const yearEnd = `${year}-12`;

    if (reportType === "form16") {
      const employeePayrolls = await db
        .select({
          userId: payrolls.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          taxId: users.taxId,
          totalGross: sql<string>`SUM(${payrolls.grossSalary}::numeric)`,
          totalNet: sql<string>`SUM(${payrolls.netSalary}::numeric)`,
          totalDeductions: sql<string>`SUM(${payrolls.deductions}::numeric)`,
          months: sql<number>`count(*)`,
        })
        .from(payrolls)
        .innerJoin(users, eq(payrolls.userId, users.id))
        .where(and(
          eq(payrolls.orgId, session.orgId),
          gte(payrolls.month, yearStart),
          lte(payrolls.month, yearEnd)
        ))
        .groupBy(payrolls.userId, users.firstName, users.lastName, users.email, users.taxId);

      return ok({
        type: "form16",
        year,
        employees: employeePayrolls.map((e) => ({
          userId: e.userId,
          name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
          email: e.email,
          pan: e.taxId,
          totalGross: Number(e.totalGross ?? 0).toFixed(2),
          totalNet: Number(e.totalNet ?? 0).toFixed(2),
          totalDeductions: Number(e.totalDeductions ?? 0).toFixed(2),
          monthsProcessed: Number(e.months),
        })),
      });
    }

    const monthlySummary = await db
      .select({
        month: payrolls.month,
        totalGross: sql<string>`SUM(${payrolls.grossSalary}::numeric)`,
        totalNet: sql<string>`SUM(${payrolls.netSalary}::numeric)`,
        totalDeductions: sql<string>`SUM(${payrolls.deductions}::numeric)`,
        employeeCount: sql<number>`count(DISTINCT ${payrolls.userId})`,
      })
      .from(payrolls)
      .where(and(
        eq(payrolls.orgId, session.orgId),
        gte(payrolls.month, yearStart),
        lte(payrolls.month, yearEnd)
      ))
      .groupBy(payrolls.month)
      .orderBy(payrolls.month);

    return ok({
      type: "summary",
      year,
      months: monthlySummary.map((m) => ({
        month: m.month,
        totalGross: Number(m.totalGross ?? 0).toFixed(2),
        totalNet: Number(m.totalNet ?? 0).toFixed(2),
        totalDeductions: Number(m.totalDeductions ?? 0).toFixed(2),
        employeeCount: Number(m.employeeCount),
      })),
    });
  });
}
