import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import { loadPayrollInputs } from "@/lib/payroll/load-inputs";
import { computePayroll } from "@/lib/payroll/compute";
import type { NextRequest } from "next/server";

/**
 * Payroll preview. Runs the same loader and the same pure function as the
 * generate route, so what is previewed is what gets saved (A3, A4).
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can preview payroll.", 403);
    }

    const params = req.nextUrl.searchParams;
    const userId = params.get("userId");
    const month = params.get("month");
    if (!userId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return err("userId and month (YYYY-MM) are required.", 400);
    }

    const bonus = Number(params.get("bonus") ?? "0") || 0;
    const otherDeductions = Number(params.get("otherDeductions") ?? "0") || 0;
    const periodEnd = params.get("periodEnd");
    const monthEnd = `${month}-${String(calendarDaysInMonth(month)).padStart(2, "0")}`;

    const inputs = await loadPayrollInputs({
      orgId: session.orgId,
      userIds: [userId],
      month,
      overrides: { [userId]: { bonus, otherDeductions } },
      evaluateThrough: periodEnd && periodEnd < monthEnd ? periodEnd : undefined,
    });
    const input = inputs.get(userId);
    if (!input) return err("Employee not found.", 404);

    return ok(computePayroll(input));
  });
}
