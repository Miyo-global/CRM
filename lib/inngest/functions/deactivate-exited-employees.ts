import { inngest } from "../client";
import { deactivateAfterLastWorkingDay } from "@/server/actions/deactivate-after-last-working-day";

/**
 * R3-SA-09 / MIYO-0145: once a day, close the accounts of people whose last
 * working day (resignation) or termination effective date has passed. Runs on
 * Inngest because vercel.json no longer schedules
 * /api/cron/deactivate-exited-employees (Hobby plan). Re-adding that Vercel
 * cron would run the job twice; it is idempotent (active users only) anyway.
 * 18:30 UTC = 00:00 IST.
 */
export const deactivateExitedEmployees = inngest.createFunction(
  { id: "deactivate-exited-employees", name: "Deactivate exited employees", triggers: { cron: "30 18 * * *" } },
  async ({ step }) => step.run("deactivate", () => deactivateAfterLastWorkingDay()),
);
