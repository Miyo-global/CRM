import { inngest } from "../client";
import { sendCelebrationGreetings } from "@/lib/hr/send-celebration-greetings";

/**
 * Daily 08:00 IST greetings for birthdays and work anniversaries (A34).
 *
 * The work lives in sendCelebrationGreetings, shared with the
 * daily-notifications cron, and is idempotent per person, per kind, per year.
 */
export const celebrationGreetings = inngest.createFunction(
  {
    id: "celebration-greetings",
    name: "Birthday and Anniversary Greetings",
    // 02:30 UTC is 08:00 IST.
    triggers: { cron: "30 2 * * *" },
  },
  async ({ step }) => step.run("greet", () => sendCelebrationGreetings()),
);
