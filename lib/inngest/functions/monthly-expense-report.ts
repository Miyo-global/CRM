import { inngest } from "../client";
import { generateAndSendMonthlyExpenseReport } from "@/server/actions/monthly-expense-report";

export const monthlyExpenseReport = inngest.createFunction(
  { id: "monthly-expense-report", name: "Monthly Expense Report", triggers: { cron: "0 8 1 * *" } },
  async ({ step }) => {
    const result = await step.run("generate-monthly-expense-report", () =>
      generateAndSendMonthlyExpenseReport()
    );
    return result;
  }
);
