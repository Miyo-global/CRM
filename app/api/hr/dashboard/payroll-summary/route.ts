import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and, inArray, sql, sum } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";
import { PAYROLL_SUMMARY_STATUSES, payrollSummaryMonths } from "@/lib/payroll/summary";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:payroll-summary:${orgId}`,
      async () => {
        const { current: currentMonth, previous: prevMonth } = payrollSummaryMonths(new Date());

        const [currentResult, prevResult] = await Promise.all([
          db
            .select({
              totalGross: sum(payrolls.grossSalary),
              totalNet: sum(payrolls.netSalary),
              totalDeductions: sum(payrolls.deductions),
              count: sql<number>`COUNT(*)`,
            })
            .from(payrolls)
            .where(
              and(
                eq(payrolls.orgId, orgId),
                eq(payrolls.month, currentMonth),
                inArray(payrolls.status, PAYROLL_SUMMARY_STATUSES),
              ),
            ),

          db
            .select({
              totalNet: sum(payrolls.netSalary),
            })
            .from(payrolls)
            .where(
              and(
                eq(payrolls.orgId, orgId),
                eq(payrolls.month, prevMonth),
                inArray(payrolls.status, PAYROLL_SUMMARY_STATUSES),
              ),
            ),
        ]);

        const cur = currentResult[0];
        const prevNet = Number(prevResult[0]?.totalNet ?? 0);
        const curNet = Number(cur?.totalNet ?? 0);
        const momChange = prevNet > 0 ? Math.round(((curNet - prevNet) / prevNet) * 100) : null;

        return {
          month: currentMonth,
          totalGross: Number(cur?.totalGross ?? 0),
          totalNet: curNet,
          totalDeductions: Number(cur?.totalDeductions ?? 0),
          employeeCount: Number(cur?.count ?? 0),
          prevMonthNet: prevNet,
          momChangePct: momChange,
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
