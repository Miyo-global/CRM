import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and, sql, sum } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:payroll-summary:${orgId}`,
      async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const currentMonth = `${year}-${month}`;

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
                sql`${payrolls.status} IN ('APPROVED', 'SUBMITTED')`,
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
                eq(
                  payrolls.month,
                  (() => {
                    const d = new Date(year, now.getMonth() - 1, 1);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  })(),
                ),
                sql`${payrolls.status} IN ('APPROVED', 'SUBMITTED')`,
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
