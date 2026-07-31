import { inngest } from "../client";
import { expireUnusedMonthlyCasualLeaves, resetYearlyLeaveBalances } from "@/server/actions/leave-actions";

export const monthlyLeaveReset = inngest.createFunction(
  { id: "monthly-leave-reset", name: "Monthly Leave Reset", triggers: { cron: "0 0 1 * *" } },
  async ({ step }) => {
    const expiryResult = await step.run("expire-monthly-casual-leaves", () =>
      expireUnusedMonthlyCasualLeaves()
    );

    const now = new Date();
    const isJanuary = now.getMonth() === 0;

    if (isJanuary) {
      const yearlyResult = await step.run("reset-yearly-leave-balances", () =>
        resetYearlyLeaveBalances()
      );
      return { monthlyExpiry: expiryResult, yearlyReset: yearlyResult };
    }

    return { monthlyExpiry: expiryResult, yearlyReset: null };
  }
);
