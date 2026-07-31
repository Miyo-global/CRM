import { inngest } from "../client";
import { generateAndSendWeeklyCeoRecap } from "@/server/actions/weekly-ceo-recap";

export const weeklyCeoRecap = inngest.createFunction(
  { id: "weekly-ceo-recap", name: "Weekly CEO Recap", triggers: { cron: "0 9 * * 1" } },
  async ({ step }) => {
    const result = await step.run("generate-weekly-ceo-recap", () =>
      generateAndSendWeeklyCeoRecap()
    );
    return result;
  }
);
