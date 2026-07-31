import { sendEmail } from "@/lib/email/sender";

const RECIPIENTS = ["hr@miyoglobal.com", "tarun@miyoglobal.com"];
const SUBJECT = "Notice Regarding Unsatisfactory Performance";
const PERIOD_FROM = "17th February";
const PERIOD_TO = "17th April";
const REVISED_SALARY_INR = 7000;

const TEST_EMPLOYEES: { name: string }[] = [
  { name: "Test Employee 01" },
  { name: "Test Employee 02" },
  { name: "Test Employee 03" },
  { name: "Test Employee 04" },
  { name: "Test Employee 05" },
  { name: "Test Employee 06" },
  { name: "Test Employee 07" },
  { name: "Test Employee 08" },
  { name: "Test Employee 09" },
  { name: "Test Employee 10" },
];

function buildHtml(employeeName: string): string {
  const salary = new Intl.NumberFormat("en-IN").format(REVISED_SALARY_INR);
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1f2937; line-height:1.6; max-width:640px; margin:0 auto; padding:24px;">
    <p>Dear ${employeeName},</p>

    <p>This is to formally notify you that your performance over the past two months
    (from ${PERIOD_FROM} to ${PERIOD_TO}) has been below the expected standards.</p>

    <p>Despite being provided with adequate time, support, and clear targets, you have
    not met the assigned sales expectations. This is a matter of serious concern and
    cannot be overlooked.</p>

    <p>As per the terms discussed at the time of your joining, the initial two months
    were considered a full salary period. Post completion of this period, due to your
    failure to meet the required performance benchmarks, your compensation will now be
    revised to a basic salary of <strong>&#8377;${salary} per month</strong>, effective
    immediately.</p>

    <p>You are hereby advised to show immediate and measurable improvement in your
    performance. Failure to meet targets going forward will result in further strict
    action, which may include a Performance Improvement Plan (PIP) or other
    disciplinary measures.</p>

    <p>Consider this as an official warning. Your performance will be closely monitored
    on a daily basis.</p>

    <p>For any clarification, you may contact your reporting manager.</p>

    <p style="margin-top:32px;">Regards,<br/>Human Resources<br/>Miyo Global</p>
  </body>
</html>`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY is not set. Aborting.");
    process.exit(1);
  }

  const recipientList = RECIPIENTS.join(", ");
  console.log(`Sending ${TEST_EMPLOYEES.length} test notices to ${recipientList}...`);

  let sent = 0;
  let failed = 0;

  for (const emp of TEST_EMPLOYEES) {
    try {
      await sendEmail({
        to: recipientList,
        subject: SUBJECT,
        html: buildHtml(emp.name),
      });
      sent += 1;
      console.log(`  [${sent}/${TEST_EMPLOYEES.length}] sent for ${emp.name}`);
    } catch (err) {
      failed += 1;
      console.error(`  [FAIL] ${emp.name}:`, err instanceof Error ? err.message : err);
    }
    await delay(500);
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
