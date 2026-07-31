import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates, organizations, departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getEmployee } from "@/server/queries/hr";
import { buildHrLetterVars, applyHrLetterTokens, HR_LETTER_TYPE_TITLES } from "@/lib/hr/hr-letter-tokens";
import { renderOfferLetterPdf } from "@/lib/hr/offer-letter-branded-pdf";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

const HR_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

const bodySchema = z.object({
  templateId: z.number().int().positive(),
  extraVars: z.record(z.string(), z.string()).optional().default({}),
  preview: z.boolean().optional().default(false),
});

type RouteParams = { params: Promise<{ employeeId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!HR_ROLES.includes(session.user.role ?? "")) return err("Forbidden", 403);

    const { employeeId } = await params;
    const input = bodySchema.parse(await req.json());

    const employee = await getEmployee(session.orgId, employeeId);
    if (!employee) return err("Employee not found", 404);

    const template = await db.query.offerLetterTemplates.findFirst({
      where: and(
        eq(offerLetterTemplates.id, input.templateId),
        eq(offerLetterTemplates.orgId, session.orgId),
      ),
    });
    if (!template) return err("Template not found", 404);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
      columns: { name: true, address: true },
    });
    if (!org) return err("Organisation not found", 404);

    let departmentName: string | null = null;
    if (employee.departmentId) {
      const dept = await db.query.departments.findFirst({
        where: eq(departments.id, employee.departmentId),
        columns: { name: true },
      });
      departmentName = dept?.name ?? null;
    }

    const addr = org.address;
    const orgAddress = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.postalCode]
          .filter(Boolean).join(", ")
      : "";

    const vars = buildHrLetterVars(
      {
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        employeeId: employee.employeeId ?? null,
        designation: employee.designation ?? null,
        departmentName,
        joiningDate: employee.joiningDate ?? null,
      },
      { name: org.name, address: orgAddress },
      new Date(),
      input.extraVars,
    );

    const filledBody = applyHrLetterTokens(template.body, vars);
    const docType = template.documentType ?? "OFFER_LETTER";
    const title = HR_LETTER_TYPE_TITLES[docType] ?? docType.replace(/_/g, " ");

    const signatureBlock = template.showSignatureBlock
      ? { employeeName: vars.employeeName, employeeId: vars.employeeId, designation: vars.designation }
      : undefined;

    const pdfBuffer = await renderOfferLetterPdf({
      bodyText: filledBody,
      headerVm: { orgName: org.name, orgAddress },
      title,
      signatureBlock,
    });

    if (input.preview) {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="letter-preview.pdf"`,
        },
      });
    }

    if (!isStorageConfigured()) return err("Storage not configured", 503);

    const ts = Date.now();
    const safeName = `${employee.firstName ?? "employee"}-${docType.toLowerCase()}-${ts}.pdf`
      .toLowerCase().replace(/[^a-z0-9.-]/g, "-");

    const { key } = await uploadFile(pdfBuffer, "hr-letters", safeName, "application/pdf", session.orgId);
    const downloadUrl = `/api/storage/download?key=${encodeURIComponent(key)}&attachment=1`;

    return NextResponse.json({ url: downloadUrl, key }, { status: 200 });
  });
}
