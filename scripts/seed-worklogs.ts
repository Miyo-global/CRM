import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { eachDayOfInterval, isSunday, format } from "date-fns";

const DESCRIPTIONS = [
  "Reviewed pull requests and provided code feedback",
  "Team standup and sprint planning session",
  "Client communication and requirement clarification",
  "Feature development and unit testing",
  "Bug investigation and hotfix deployment",
  "Documentation update and knowledge base maintenance",
  "Design review and UI/UX feedback session",
  "Database query optimisation and performance review",
  "Cross-team sync and project alignment meeting",
  "Code refactoring and technical debt cleanup",
  "Onboarding support and internal knowledge transfer",
  "Quarterly reporting and data analysis",
  "Security review and vulnerability assessment",
  "Performance monitoring and incident triage",
  "Product roadmap discussion and backlog grooming",
  "Integration testing and end-to-end QA",
  "Stakeholder presentation and demo prep",
  "API development and endpoint documentation",
  "Infrastructure review and deployment pipeline updates",
  "Research and proof-of-concept development",
  "Marketing campaign review and content strategy session",
  "Sales pipeline update and lead follow-up",
  "Support ticket resolution and customer escalation handling",
  "Financial report review and budget reconciliation",
  "HR process improvements and policy documentation",
  "Competitor analysis and market research",
  "Weekly team retrospective and action item tracking",
  "Internal tool improvements and automation scripting",
  "Code review session with junior team members",
  "Status update report and stakeholder email communication",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHours(): string {
  const base = 7 + Math.floor(Math.random() * 3); // 7, 8, or 9
  const half = Math.random() < 0.25 ? 0.5 : 0;
  return (base + half).toFixed(1);
}

async function main() {
  const { db } = await import("../lib/db");
  const { organizations, organizationMembers } = await import("../lib/db/schema");
  const { timesheets } = await import("../lib/db/schema/projects");
  const { eq } = await import("drizzle-orm");

  const org = await db.query.organizations.findFirst();
  if (!org) {
    console.error("No organisation found.");
    process.exit(1);
  }
  console.log(`Org: ${org.name} (${org.id})`);

  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, org.id));

  console.log(`Members: ${members.length}`);

  // May 1 – June 19 2026 (today), skipping Sundays
  const workingDays = eachDayOfInterval({
    start: new Date(2026, 4, 1),
    end: new Date(2026, 5, 19),
  }).filter((d) => !isSunday(d));

  console.log(`Working days in range: ${workingDays.length}`);

  let totalInserted = 0;

  for (const { userId } of members) {
    const rows = workingDays
      .filter(() => Math.random() < 0.82) // ~82% attendance per employee
      .map((day) => ({
        orgId: org.id,
        userId,
        date: format(day, "yyyy-MM-dd"),
        hours: randomHours(),
        description: pick(DESCRIPTIONS),
        status: "SAVED",
      }));

    if (rows.length === 0) continue;

    await db.insert(timesheets).values(rows).onConflictDoNothing();
    totalInserted += rows.length;
    console.log(`  ${userId}: ${rows.length} entries`);
  }

  console.log(`\nDone. ${totalInserted} work log entries seeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
