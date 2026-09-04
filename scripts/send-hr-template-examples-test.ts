/**
 * Sends 10 HR custom-template-style emails to a test inbox.
 * Run: pnpm exec tsx --env-file=.env scripts/send-hr-template-examples-test.ts
 * Override: TEST_EMAIL_TO=you@example.com
 */
import { sendEmail } from "@/lib/email/sender";
import { requireEmailEnv } from "./_guard";
import { isEmailConfigured, emailNotConfiguredMessage } from "@/lib/email/config";

const TO = requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the sample emails.");

const vars: Record<string, string> = {
  name: "Priya Sharma (QA test)",
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya.sharma@test.miyoglobal.local",
  employeeCode: "EMP-QA-1042",
  designation: "Senior Sales Associate",
  department: "Sales — West",
  joiningDate: "2024-06-01",
  phone: "+91 98765 43210",
  date: new Date().toLocaleDateString(undefined, { dateStyle: "long" }),
  today: new Date().toISOString().slice(0, 10),
  effectiveDate: "1 June 2026",
  newSalary: "₹8,50,000 p.a.",
  assetList: "Laptop (Dell Latitude), ID badge, corporate SIM",
  meetingDate: "15 May 2026",
  meetingTime: "3:00 PM IST",
  lastWorkingDay: "30 May 2026",
};

function merge(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

const templates: { name: string; subject: string; body: string }[] = [
  {
    name: "01-offer-letter",
    subject: "Offer of employment — {{designation}} at Miyo Global",
    body: `<p>Dear {{firstName}},</p>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong>, starting <strong>{{joiningDate}}</strong>, subject to completion of pre-employment requirements.</p>
<p>Please confirm acceptance by replying to this email. If you have questions, contact HR.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "02-late-coming-warning",
    subject: "Formal reminder — punctuality ({{date}})",
    body: `<p>Dear {{name}},</p>
<p>This is to record that on <strong>{{date}}</strong> you arrived late without prior approval. Punctuality is important for team coordination.</p>
<p>Please ensure you are on time going forward. Repeated instances may lead to further action under company policy.</p>
<p>Contact your reporting manager if you need support.</p>
<p>Regards,<br/>HR</p>`,
  },
  {
    name: "03-welcome-day-one",
    subject: "Welcome to the team, {{firstName}}",
    body: `<p>Hi {{firstName}},</p>
<p>Welcome to <strong>{{department}}</strong>! Your employee code is <strong>{{employeeCode}}</strong>.</p>
<p>On your first day, report to reception with ID proof. Your manager will walk you through tools and introductions.</p>
<p>We’re glad you’re here.<br/>HR</p>`,
  },
  {
    name: "04-probation-confirmation",
    subject: "Probation period — confirmation",
    body: `<p>Dear {{name}},</p>
<p>Your probation ending <strong>{{today}}</strong> has been reviewed. We are happy to confirm continuation in your role as <strong>{{designation}}</strong>.</p>
<p>Thank you for your contribution so far. Your manager will set goals for the next period.</p>
<p>Best,<br/>HR</p>`,
  },
  {
    name: "05-leave-approved",
    subject: "Leave request approved",
    body: `<p>Hi {{firstName}},</p>
<p>Your leave request has been <strong>approved</strong>. Please ensure a clean handover and update your calendar.</p>
<p>For emergencies, your manager remains the first point of contact.</p>
<p>Regards,<br/>HR</p>`,
  },
  {
    name: "06-handbook-ack",
    subject: "Action required — employee handbook acknowledgment",
    body: `<p>Dear {{name}},</p>
<p>Please read the updated employee handbook in the HR portal and complete the acknowledgment by <strong>{{today}}</strong> (or the date communicated by your manager).</p>
<p>This covers code of conduct, leave, expenses, and IT usage.</p>
<p>Thanks,<br/>HR</p>`,
  },
  {
    name: "07-salary-revision",
    subject: "Compensation update — effective {{effectiveDate}}",
    body: `<p>Dear {{name}},</p>
<p>Following your performance review, your compensation is revised to <strong>{{newSalary}}</strong>, effective <strong>{{effectiveDate}}</strong>.</p>
<p>Details will appear in your next payslip. For questions, contact HR.</p>
<p>Regards,<br/>HR</p>`,
  },
  {
    name: "08-it-assets",
    subject: "IT assets assigned — please confirm",
    body: `<p>Hi {{firstName}},</p>
<p>The following IT assets are assigned to you: <strong>{{assetList}}</strong>.</p>
<p>Return all items in good condition on exit. Report loss or damage to IT immediately.</p>
<p>Thanks,<br/>IT &amp; HR</p>`,
  },
  {
    name: "09-disciplinary-meeting",
    subject: "Meeting scheduled — performance discussion",
    body: `<p>Dear {{name}},</p>
<p>We need to discuss recent concerns regarding your performance / conduct. Please attend a meeting on <strong>{{meetingDate}}</strong> at <strong>{{meetingTime}}</strong>.</p>
<p>You may bring a colleague where permitted by policy. Reply to confirm attendance.</p>
<p>Regards,<br/>HR</p>`,
  },
  {
    name: "10-offboarding-thanks",
    subject: "Thank you — {{name}}",
    body: `<p>Dear {{name}},</p>
<p>Thank you for your work with us in <strong>{{department}}</strong>. We wish you success in your next chapter.</p>
<p>Exit formalities (assets, clearance, F&amp;F) are outlined in the portal. Complete them by <strong>{{lastWorkingDay}}</strong>.</p>
<p>Best wishes,<br/>HR</p>`,
  },
];

async function main() {
  if (!isEmailConfigured()) {
    console.error(emailNotConfiguredMessage());
    process.exit(1);
  }

  console.log(`Sending ${templates.length} HR template examples to ${TO}…`);

  for (const t of templates) {
    const subject = `[HR template test: ${t.name}] ${merge(t.subject)}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">${merge(t.body)}</div>`;
    await sendEmail({ to: TO, subject, html });
    console.log("  sent:", t.name);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
