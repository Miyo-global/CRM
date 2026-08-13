/**
 * Sends sample recruitment HR notification emails (SendGrid).
 * Run: pnpm exec tsx --env-file=.env scripts/send-recruitment-email-samples.ts
 */
import { sendEmail } from "@/lib/email/sender";
import { requireEmailEnv } from "./_guard";
import {
  getRecruitmentHrEmail,
  type RecruitmentEmailEvent,
} from "@/lib/email-templates/hr-recruitment";

const TO = requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the sample emails.");

const SAMPLES: { event: RecruitmentEmailEvent; label: string }[] = [
  { event: "job_created", label: "Job created (draft)" },
  { event: "job_published", label: "Job published" },
  { event: "job_deleted", label: "Job deleted" },
  { event: "applications_auto_closed", label: "Applications auto-closed" },
  { event: "new_application", label: "New application received" },
];

const baseParams = {
  jobId: 42,
  jobTitle: "Senior Software Engineer",
  location: "Hyderabad",
  jobType: "FULL_TIME",
  applicationDeadline: "11 June 2026",
  actorName: "Sruthi HR",
  candidateName: "Tarun Chintakunta",
  candidateEmail: "applicant@example.com",
};

async function main() {
  console.log(`Sending ${SAMPLES.length} recruitment email samples to ${TO}…`);

  for (const sample of SAMPLES) {
    const params =
      sample.event === "applications_auto_closed"
        ? { ...baseParams, closedCount: 1 }
        : baseParams;

    const { subject, html } = getRecruitmentHrEmail(sample.event, params);
    const taggedSubject = `[Sample: ${sample.label}] ${subject}`;

    await sendEmail({ to: TO, subject: taggedSubject, html });
    console.log(`✓ ${sample.label}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
