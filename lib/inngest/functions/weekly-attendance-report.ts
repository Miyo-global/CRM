import { inngest } from "../client";
import { generateAndSendWeeklyReport } from "@/server/actions/weekly-attendance-report";

export const weeklyAttendanceReport = inngest.createFunction(
  { id: "weekly-attendance-report", name: "Weekly Attendance Report", triggers: { cron: "0 8 * * 1" } },
  async ({ step }) => {
    const result = await step.run("generate-weekly-attendance-report", () =>
      generateAndSendWeeklyReport()
    );
    return result;
  }
);
