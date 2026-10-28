import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTerminationEmail } from "@/lib/email";
import { generateTerminationLetterPdf } from "@/lib/termination-letter-pdf";
import { writeAuditLog } from "@/lib/db/audit";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    // R2-TERM-01: Admins start terminations, so they run the HR steps too.
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or an Admin can send termination emails.", 403);
    }

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true },
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "APPROVED") return err("Termination must be approved by the Super Admin before sending.", 400);

    if (existing.emailSentAt && existing.emailStatus === "sent") {
      return err("Termination email has already been sent.", 409);
    }

    const employee = existing.user;
    if (!employee?.email) return err("Employee email not found.", 400);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    const effectiveDateStr = existing.effectiveDate
      ? format(new Date(existing.effectiveDate), "dd-MM-yyyy")
      : "N/A";

    try {
      const pdfBuffer = await generateTerminationLetterPdf({
        employeeName: employee.name ?? "Employee",
        employeeId: employee.employeeId ?? undefined,
        designation: employee.designation ?? "N/A",
        effectiveDate: effectiveDateStr,
        reasons: existing.reasons ?? [],
        detailedExplanation: existing.detailedExplanation ?? undefined,
        hrName: session.user.name ?? "HR Executive",
        hrDesignation: session.user.role === "CEO" ? "CEO" : "HR Executive",
        companyName: org?.name ?? "MIYO GLOBAL",
      });

      // MIYO-0158: the work inbox is about to close, so write to the
      // personal address when we have one.
      await sendTerminationEmail(
        employee.personalEmail?.trim() || employee.email,
        employee.name ?? "Employee",
        existing.effectiveDate ? new Date(existing.effectiveDate) : new Date(),
        session.user.name ?? "HR",
        [
          {
            filename: `Termination-Letter-${(employee.name ?? "Employee").replace(/\s+/g, "-")}.pdf`,
            content: pdfBuffer,
            type: "application/pdf",
          },
        ]
      );

      await db.update(terminations).set({
        status: "SENT",
        emailSentAt: new Date(),
        emailStatus: "sent",
        updatedAt: new Date(),
      }).where(eq(terminations.id, terminationId));

      void writeAuditLog({
        action: "TERMINATION_EMAIL_SENT",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(terminationId),
        targetType: "termination",
        metadata: {
          employeeId: existing.userId,
          employeeName: employee.name,
          employeeEmail: employee.email,
          pdfAttached: true,
        },
      }).catch(() => undefined);

      return ok({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown email error";

      await db.update(terminations).set({
        // Provider error text stays in the audit log, not in a field the UI shows.
        emailStatus: "failed",
        updatedAt: new Date(),
      }).where(eq(terminations.id, terminationId));

      void writeAuditLog({
        action: "TERMINATION_EMAIL_FAILED",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(terminationId),
        targetType: "termination",
        metadata: {
          employeeId: existing.userId,
          error: errorMessage,
        },
      }).catch(() => undefined);

      return err("Failed to send email. Please try again later.", 500);
    }
  });
}
