import { withAuth, err } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payrolls, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { buildPayslipPdfDataFromPayroll, generatePayslipPdf } from "@/lib/payslip-pdf";
import { countApprovedLeaveDaysInMonth } from "@/server/queries/hr/payslip-leave-days";
import { buildPayslipHtml, loadLogoSvgForPayslip } from "@/lib/hr/payslip-html";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

const ORG_FULL_NAME_HEADER = "Miyo Global";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withAuth(async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const payroll = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
    });
    if (!payroll) return err("Payroll not found.", 404);
    if (payroll.status !== "PAID") return err("Payslip only available for PAID payrolls.", 400);

    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin && payroll.userId !== session.user.id) {
      return err("Access denied.", 403);
    }

    const employee = await db.query.users.findFirst({
      where: eq(users.id, payroll.userId),
    });
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    const leaveDays =
      payroll.leaveDaysDisplay != null
        ? parseFloat(payroll.leaveDaysDisplay)
        : payroll.month && payroll.userId
          ? await countApprovedLeaveDaysInMonth(session.orgId, payroll.userId, payroll.month)
          : 0;

    const vmOpts = {
      leaveDaysInMonth: leaveDays,
      showPaidBadge: true,
      orgFullNameOverride: ORG_FULL_NAME_HEADER,
    } as const;

    if (req.nextUrl.searchParams.get("format") === "pdf") {
      if (!employee) return err("Employee not found.", 404);
      const pdfData = buildPayslipPdfDataFromPayroll(payroll, employee, org ?? { name: null, address: null }, vmOpts);
      const buffer = await generatePayslipPdf(pdfData);
      const safeName = (employee.name ?? "employee").replace(/\s+/g, "-");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Payslip-${safeName}-${payroll.month ?? "unknown"}.pdf"`,
        },
      });
    }

    if (!employee) return err("Employee not found.", 404);

    const vm = buildPayslipPdfDataFromPayroll(payroll, employee, org ?? { name: null, address: null }, vmOpts);
    const logoSvg = await loadLogoSvgForPayslip();
    const showToolbar = req.nextUrl.searchParams.get("toolbar") !== "0";
    const html = buildPayslipHtml(vm, { logoSvg, includePrintToolbar: showToolbar });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="payslip-${(employee.name ?? "employee").replace(/\s+/g, "-")}-${payroll.month ?? "unknown"}.html"`,
      },
    });
  });
}
