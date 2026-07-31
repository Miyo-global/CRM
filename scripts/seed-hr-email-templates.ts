import * as dotenv from "dotenv";

import { HR_EMAIL_CATALOG_TEMPLATES } from "./data/hr-email-catalog-templates";

dotenv.config({ path: ".env" });

type SeedTemplate = {
  name: string;
  category: string;
  subject: string;
  body: string;
};

function extractMergeKeys(subject: string, body: string): string[] {
  const keys = new Set<string>();
  const text = `${subject}\n${body}`;
  for (const match of text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const k = String(match[1] ?? "").trim();
    if (k) keys.add(k);
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

/** Recruitment / onboarding extras (stable names; not part of the 01–31 discipline catalog). */
const SEED_TEMPLATES_EXTRA: SeedTemplate[] = [
  {
    name: "Offer letter (basic)",
    category: "Offer letter",
    subject: "Offer of employment — {{designation}} at Miyo Global",
    body: `<p>Dear {{firstName}},</p>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong>, starting <strong>{{joiningDate}}</strong>, subject to completion of pre-employment requirements.</p>
<p>Please confirm acceptance by replying to this email. If you have questions, contact HR.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "Welcome — day one",
    category: "Onboarding",
    subject: "Welcome to the team, {{firstName}}",
    body: `<p>Hi {{firstName}},</p>
<p>Welcome to <strong>{{department}}</strong>! Your employee code is <strong>{{employeeCode}}</strong>.</p>
<p>On your first day, report to reception with ID proof. Your manager will walk you through tools and introductions.</p>
<p>We're glad you're here.<br/>HR</p>`,
  },
  {
    name: "Probation confirmation",
    category: "Performance Management",
    subject: "Probation period — confirmation",
    body: `<p>Dear {{employee_name}},</p>
<p>Your probation ending <strong>{{today}}</strong> has been reviewed. We are happy to confirm continuation in your role as <strong>{{designation}}</strong>.</p>
<p>Thank you for your contribution so far. Your manager will set goals for the next period.</p>
<p>Best,<br/>HR</p>`,
  },
  {
    name: "Leave approved (generic)",
    category: "Leave",
    subject: "Leave request approved",
    body: `<p>Hi {{firstName}},</p>
<p>Your leave request has been <strong>approved</strong>. Please ensure a clean handover and update your calendar.</p>
<p>For emergencies, your manager remains the first point of contact.</p>
<p>Regards,<br/>HR</p>`,
  },
  {
    name: "Handbook acknowledgment",
    category: "General",
    subject: "Action required — employee handbook acknowledgment",
    body: `<p>Dear {{employee_name}},</p>
<p>Please read the updated employee handbook in the HR portal and complete the acknowledgment by <strong>{{today}}</strong>.</p>
<p>This covers code of conduct, leave, expenses, and IT usage.</p>
<p>Thanks,<br/>HR</p>`,
  },
  {
    name: "IT assets assigned",
    category: "Onboarding",
    subject: "IT assets assigned — please confirm",
    body: `<p>Hi {{firstName}},</p>
<p>The following IT assets are assigned to you: <strong>{{assetList}}</strong>.</p>
<p>Return all items in good condition on exit. Report loss or damage to IT immediately.</p>
<p>Thanks,<br/>IT &amp; HR</p>`,
  },
];

const SEED_TEMPLATES: SeedTemplate[] = [...HR_EMAIL_CATALOG_TEMPLATES, ...SEED_TEMPLATES_EXTRA];

async function main() {
  const { db, client } = await import("../lib/db");
  const { emailTemplates, organizations, users } = await import("../lib/db/schema");
  const { and, eq, desc } = await import("drizzle-orm");

  try {
    const orgSlug = process.env.SEED_ORG_SLUG ?? "miyo-global";
    const org =
      (await db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.slug, orgSlug),
      })) ?? (await db.query.organizations.findFirst());

    if (!org) {
      throw new Error("No organization found. Seed org first.");
    }

    const creatorEmail =
      process.env.SEED_CREATED_BY_EMAIL ??
      process.env.TEST_EMAIL_TO ??
      "tarunchintakunta@gmail.com";
    const creator =
      (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, creatorEmail) })) ??
      (await db.query.users.findFirst({ orderBy: (u, { desc }) => desc(u.createdAt) }));

    const createdBy = creator?.id ?? null;

    let inserted = 0;
    let updated = 0;

    for (const t of SEED_TEMPLATES) {
      const vars = extractMergeKeys(t.subject, t.body);

      const existing = await db.query.emailTemplates.findFirst({
        where: and(eq(emailTemplates.orgId, org.id), eq(emailTemplates.name, t.name)),
      });

      if (existing) {
        await db
          .update(emailTemplates)
          .set({
            subject: t.subject,
            body: t.body,
            category: t.category,
            variables: vars.length ? vars : null,
            updatedAt: new Date(),
          })
          .where(and(eq(emailTemplates.id, existing.id), eq(emailTemplates.orgId, org.id)));
        updated += 1;
        continue;
      }

      await db.insert(emailTemplates).values({
        orgId: org.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        category: t.category,
        variables: vars.length ? vars : null,
        createdBy: createdBy ?? undefined,
      });
      inserted += 1;
    }

    // eslint-disable-next-line no-console
    console.log(
      `Seeded HR email templates for org=${org.slug ?? org.id}. inserted=${inserted} updated=${updated} (catalog=${HR_EMAIL_CATALOG_TEMPLATES.length})`
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
