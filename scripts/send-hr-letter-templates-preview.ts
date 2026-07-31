/**
 * Generates all HR letter templates as PDFs and emails them one-by-one
 * to chintakuntatarun@gmail.com using that user's employee profile data.
 *
 * Run: ALLOW_REMOTE_DB=1 pnpm tsx scripts/send-hr-letter-templates-preview.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const TO = "chintakuntatarun@gmail.com";

const EXTRA_VARS: Record<string, Record<string, string>> = {
  TERMINATION: {
    effectiveDate: "30 June 2026",
    lastWorkingDay: "30 June 2026",
  },
  TERMINATION_HR: {
    terminationDate: "30 June 2026",
    hrName: "Vamsi Siva Sairam",
    hrDesignation: "Founder and President",
  },
  APPOINTMENT: {
    monthlySalary: "50,000",
    annualSalary: "6,00,000",
    reportingManager: "Vamsi Siva Sairam",
  },
  EXPERIENCE: { relievingDate: "30 June 2026" },
  RELIEVING:  { relievingDate: "30 June 2026" },
  INCREMENT:  { newSalary: "₹60,000 / month", effectiveDate: "01 July 2026" },
  WARNING:    { incidentDate: "20 June 2026" },
};

async function main() {
  const { db, client } = await import("../lib/db");
  const { offerLetterTemplates, organizations, users } = await import("../lib/db/schema");
  const { eq, and, ne } = await import("drizzle-orm");
  const { sendEmail } = await import("../lib/email/sender");
  const { buildHrLetterVars, applyHrLetterTokens, HR_LETTER_TYPE_TITLES } = await import("../lib/hr/hr-letter-tokens");
  const { renderOfferLetterPdf } = await import("../lib/hr/offer-letter-branded-pdf");

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, TO),
    });
    if (!user) throw new Error(`No user found for ${TO}`);

    const { organizationMembers } = await import("../lib/db/schema");
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
    });
    if (!membership) throw new Error(`No org membership for ${TO}`);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.orgId),
    });
    if (!org) throw new Error("Organisation not found.");

    const { getEmployee } = await import("../server/queries/hr");
    const employee = await getEmployee(org.id, user.id);
    if (!employee) throw new Error(`No org membership found for ${TO} in org ${org.id}`);

    const empInput = {
      firstName: employee.firstName ?? user.name?.split(" ")[0] ?? "Tarun",
      lastName: employee.lastName ?? user.name?.split(" ").slice(1).join(" ") ?? "Chintakunta",
      employeeId: employee.employeeId ?? null,
      designation: employee.designation ?? null,
      departmentName: employee.department?.name ?? null,
      joiningDate: employee.joiningDate ?? null,
    };

    const addr = org.address;
    const orgAddress = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.postalCode]
          .filter(Boolean).join(", ")
      : "Vijay Tech Park, Madhapur, HITEC City, Hyderabad, Telangana 500081";

    const templates = await db.query.offerLetterTemplates.findMany({
      where: and(
        eq(offerLetterTemplates.orgId, org.id),
        ne(offerLetterTemplates.documentType, "OFFER_LETTER"),
      ),
    });

    if (!templates.length) throw new Error("No letter templates found. Run seed-hr-letter-templates.ts first.");

    console.log(`Found ${templates.length} templates. Sending to ${TO}…\n`);

    for (const tmpl of templates) {
      const docType = tmpl.documentType ?? "TERMINATION";
      const extra = EXTRA_VARS[docType] ?? {};
      const vars = buildHrLetterVars(empInput, { name: org.name, address: orgAddress }, new Date(), extra);
      const filledBody = applyHrLetterTokens(tmpl.body, vars);
      const title = HR_LETTER_TYPE_TITLES[docType] ?? docType.replace(/_/g, " ");

      const signatureBlock = tmpl.showSignatureBlock
        ? { employeeName: vars.employeeName, employeeId: vars.employeeId, designation: vars.designation }
        : undefined;

      const pdfBuffer = await renderOfferLetterPdf({
        bodyText: filledBody,
        headerVm: { orgName: org.name, orgAddress },
        title,
        signatureBlock,
      });

      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filename = `${safeTitle}.pdf`;

      await sendEmail({
        to: TO,
        subject: `[Letter Template Preview] ${title}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#333">
            <h2 style="color:#1e40af">${title}</h2>
            <p>Hi Tarun,</p>
            <p>Please find attached the <strong>${tmpl.name}</strong> letter template as a PDF preview.</p>
            <p>This is generated using your employee profile data from Miyo Global CRM.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="color:#6b7280;font-size:12px">Miyo Global — HR Letter Templates Preview</p>
          </div>
        `,
        attachments: [
          {
            filename,
            content: Buffer.from(pdfBuffer),
            type: "application/pdf",
          },
        ],
      });

      console.log(`✓ Sent: ${tmpl.name} (${filename})`);
    }

    console.log(`\nAll ${templates.length} templates sent to ${TO}.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
