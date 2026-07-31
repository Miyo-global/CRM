import { withAdmin, parseBody } from "@/lib/api/helpers";
import { generatePayslipPdf } from "@/lib/payslip-pdf";
import { manualPayslipBodyToPdfData, manualPayslipPdfBodySchema } from "@/lib/hr/manual-payslip-pdf";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const body = await parseBody(req, manualPayslipPdfBodySchema);
    const pdfData = manualPayslipBodyToPdfData(body);
    const buffer = await generatePayslipPdf(pdfData);

    const safeName = body.employeeName.replace(/\s+/g, "-");
    const monthPart = body.month ?? "custom";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Payslip-${safeName}-${monthPart}.pdf"`,
      },
    });
  });
}
