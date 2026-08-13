import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import { generateTerminationLetterPdf } from "@/lib/termination-letter-pdf";
import { escapeHtml } from "@/lib/email-templates/base";
import { NextResponse, type NextRequest } from "next/server";
import { HR_EMAIL } from "@/lib/constants/company";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const termination = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true },
    });
    if (!termination) return err("Termination not found.", 404);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    const employee = termination.user;
    const effectiveDateStr = termination.effectiveDate
      ? format(new Date(termination.effectiveDate), "dd-MM-yyyy")
      : "N/A";

    const wantsPdf = req.nextUrl.searchParams.get("format") === "pdf";

    if (wantsPdf) {
      const pdfBuffer = await generateTerminationLetterPdf({
        employeeName: employee?.name ?? "Employee",
        employeeId: employee?.employeeId ?? undefined,
        designation: employee?.designation ?? "N/A",
        effectiveDate: effectiveDateStr,
        reasons: termination.reasons ?? [],
        detailedExplanation: termination.detailedExplanation ?? undefined,
        hrName: session.user.name ?? "HR Executive",
        hrDesignation: session.user.role === "CEO" ? "CEO" : "HR Executive",
        companyName: org?.name ?? "MIYO GLOBAL",
      });

      const filename = `Termination-Letter-${(employee?.name ?? "Employee").replace(/\s+/g, "-")}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const letterHtml = generateTerminationLetterHtml({
      employeeName: employee?.name ?? "Employee",
      designation: employee?.designation ?? "N/A",
      companyName: org?.name ?? "the Company",
      reasons: termination.reasons ?? [],
      effectiveDate: termination.effectiveDate ? format(new Date(termination.effectiveDate), "dd MMM yyyy") : "N/A",
      severanceAmount: termination.severanceAmount,
      date: format(new Date(), "dd MMM yyyy"),
    });

    return ok({ html: letterHtml });
  });
}

function generateTerminationLetterHtml(data: {
  employeeName: string;
  designation: string;
  companyName: string;
  reasons: string[];
  effectiveDate: string;
  severanceAmount: string | null;
  date: string;
}): string {
  const employeeName = escapeHtml(data.employeeName);
  const designation = escapeHtml(data.designation);
  const companyName = escapeHtml(data.companyName);
  const reasonsList = data.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("\n");

  return `
<div style="font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px; line-height: 1.8;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
    <h2 style="margin: 0;">${companyName}</h2>
    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">CONFIDENTIAL</p>
  </div>

  <p style="text-align: right;">Date: ${data.date}</p>

  <p>To,<br/>
  <strong>${employeeName}</strong><br/>
  ${designation}<br/>
  ${companyName}</p>

  <p><strong>Subject: Termination of Employment</strong></p>

  <p>Dear ${employeeName},</p>

  <p>This letter is to formally notify you that your employment with <strong>${companyName}</strong> is being terminated, effective <strong>${data.effectiveDate}</strong>.</p>

  <p><strong>Reason(s) for Termination:</strong></p>
  <ul>${reasonsList}</ul>

  ${data.severanceAmount ? `<p><strong>Severance:</strong> You will receive a severance payment of <strong>INR ${data.severanceAmount}</strong>, subject to applicable deductions and taxes. This amount will be included in your final settlement.</p>` : ""}

  <p><strong>Final Settlement:</strong> Your final settlement, including any pending salary, leave encashment, and other dues, will be processed within 45 days from the effective date of termination.</p>

  <p><strong>Return of Company Property:</strong> You are requested to hand over all company assets, documents, and responsibilities to <strong>Reporting Manager/HR</strong> on your last working day.</p>

  <p><strong>Confidentiality:</strong> All confidentiality and non-disclosure agreements remain in full effect even after termination.</p>

  <p>We wish you the best in your future endeavours.</p>

  <p style="margin-top: 40px;">
  Sincerely,<br/><br/>
  <strong>Human Resources Department</strong><br/>
  ${companyName}
  </p>

  <p style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
    For queries, please contact HR at <a href="mailto:${HR_EMAIL}">${HR_EMAIL}</a>
  </p>
</div>`.trim();
}
