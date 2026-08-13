/**
 * Sends 10 candidate stage emails (rejection, selection, screening) as samples.
 * Run: pnpm exec tsx --env-file=.env scripts/send-candidate-stage-samples.ts
 */
import { sendEmail } from "@/lib/email/sender";
import { requireEmailEnv } from "./_guard";
import {
  getApplicationConfirmationEmail,
  getCandidateShortlistedEmail,
  getCandidateInterviewInviteEmail,
  getCandidateRejectionEmail,
  getCandidateOfferEmail,
  buildBookingConfirmationHtml,
  buildOfferDecisionConfirmationHtml,
} from "@/lib/email-templates/hr-recruitment";

const RECIPIENTS = [requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the candidate-stage samples.")];

const COMPANY = "Miyo Global";

const SAMPLES: { label: string; email: () => { subject: string; html: string } }[] = [
  {
    label: "1. Application received — Priya Sharma (Business Analyst)",
    email: () => getApplicationConfirmationEmail({
      candidateName: "Priya Sharma",
      jobTitle: "Business Analyst",
    }),
  },
  {
    label: "2. Application received — Arjun Mehta (Sales Executive)",
    email: () => getApplicationConfirmationEmail({
      candidateName: "Arjun Mehta",
      jobTitle: "Sales Executive",
    }),
  },
  {
    label: "3. Shortlisted — Neha Reddy (HR Generalist)",
    email: () => getCandidateShortlistedEmail({
      candidateName: "Neha Reddy",
      jobTitle: "HR Generalist",
      companyName: COMPANY,
    }),
  },
  {
    label: "4. Shortlisted — Karthik Iyer (Senior Software Engineer)",
    email: () => getCandidateShortlistedEmail({
      candidateName: "Karthik Iyer",
      jobTitle: "Senior Software Engineer",
      companyName: COMPANY,
    }),
  },
  {
    label: "5. Interview invite Round 1 — Divya Nair (Finance Manager)",
    email: () => getCandidateInterviewInviteEmail({
      candidateName: "Divya Nair",
      jobTitle: "Finance Manager",
      companyName: COMPANY,
      roundName: "HR Screening",
      roundNumber: 1,
      durationMinutes: 30,
      mode: "VIDEO",
    }),
  },
  {
    label: "6. Interview invite Round 2 — Rohit Bansal (Product Manager)",
    email: () => getCandidateInterviewInviteEmail({
      candidateName: "Rohit Bansal",
      jobTitle: "Product Manager",
      companyName: COMPANY,
      roundName: "Technical Round",
      roundNumber: 2,
      durationMinutes: 60,
      mode: "ONSITE",
    }),
  },
  {
    label: "7. Interview confirmed — Sneha Kulkarni (Operations Lead)",
    email: () => buildBookingConfirmationHtml({
      candidateName: "Sneha Kulkarni",
      orgName: COMPANY,
      slotFormatted: "Friday, 27 June 2026 at 11:00 AM IST",
      durationMinutes: 45,
      meetingLink: "https://meet.google.com/abc-defg-hij",
    }),
  },
  {
    label: "8. Rejection — Aditya Verma (Marketing Manager)",
    email: () => getCandidateRejectionEmail({
      candidateName: "Aditya Verma",
      jobTitle: "Marketing Manager",
      companyName: COMPANY,
    }),
  },
  {
    label: "9. Rejection — Pooja Singh (Data Analyst)",
    email: () => getCandidateRejectionEmail({
      candidateName: "Pooja Singh",
      jobTitle: "Data Analyst",
      companyName: COMPANY,
    }),
  },
  {
    label: "10. Offer extended — Vikram Nambiar (Investment Associate)",
    email: () => getCandidateOfferEmail({
      candidateName: "Vikram Nambiar",
      jobTitle: "Investment Associate",
      companyName: COMPANY,
      designation: "Investment Associate",
      salary: "₹14,00,000 per annum",
      joiningDate: "14 July 2026",
      validUntil: "30 June 2026",
    }),
  },
];

async function main() {
  console.log(`Sending ${SAMPLES.length} candidate stage emails to: ${RECIPIENTS.join(", ")}\n`);

  for (const sample of SAMPLES) {
    const { subject, html } = sample.email();
    for (const to of RECIPIENTS) {
      await sendEmail({ to, subject: `[Sample] ${subject}`, html });
    }
    console.log(`✓ ${sample.label}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
