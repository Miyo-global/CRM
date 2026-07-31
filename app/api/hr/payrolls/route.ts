import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getPayrolls } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { generatePayrollForOrg } from "@/lib/hr/generate-payroll-for-org";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";

const generatePayrollSchema = z
  .object({
    month: z.string().optional(),
    /** Custom pay period within a single calendar month (YYYY-MM-DD). */
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    overrides: z
      .record(
        z.string(),
        z.object({
          otherDeductions: z.number().min(0).optional(),
          bonus: z.number().min(0).optional(),
        }),
      )
      .optional(),
  })
  .refine((b) => (b.periodStart ? !!b.periodEnd : true) && (b.periodEnd ? !!b.periodStart : true), {
    message: "Both periodStart and periodEnd are required for a custom period.",
  });

export async function GET() {
  return withAuth(async (session) => {
    const data = await getPayrolls(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can generate payroll.", 403);
    }

    const body = await parseBody(req, generatePayrollSchema);

    // Resolve the target month + optional attendance-window cap. A custom
    // period (start/end) must fall inside one calendar month; the payroll row
    // remains keyed by that month and the window is capped at periodEnd.
    let month: string;
    let evaluateThrough: string | undefined;

    if (body.periodStart && body.periodEnd) {
      if (body.periodEnd < body.periodStart) {
        return err("Custom period end cannot be before its start.", 400);
      }
      const startMonth = body.periodStart.slice(0, 7);
      const endMonth = body.periodEnd.slice(0, 7);
      if (startMonth !== endMonth) {
        return err(
          "Custom pay period must fall within a single calendar month. Payroll is keyed per calendar month.",
          400,
        );
      }
      month = startMonth;
      const calDays = calendarDaysInMonth(month);
      const monthEnd = `${month}-${String(calDays).padStart(2, "0")}`;
      // Only cap the window if the period ends before month-end.
      if (body.periodEnd < monthEnd) evaluateThrough = body.periodEnd;
    } else {
      if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
        return err("month is required in YYYY-MM format.", 400);
      }
      month = body.month;
    }

    let result: { generated: number };
    try {
      result = await generatePayrollForOrg({
        orgId: session.orgId,
        month,
        generatedBy: session.user.id,
        overrides: body.overrides,
        evaluateThrough,
      });
    } catch (e) {
      logger.error("Bulk payroll generation failed", {
        error: e instanceof Error ? e.message : "Unknown",
        orgId: session.orgId,
        month,
      });
      return err("Could not generate payroll; please retry.", 500);
    }

    return ok({ generated: result.generated });
  });
}
