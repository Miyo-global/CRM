import { inngest } from "../client";
import { sendHolidayNotifications } from "@/server/actions/holiday-actions";

export const holidayNotifications = inngest.createFunction(
  { id: "holiday-notifications", name: "Holiday Notifications", triggers: { cron: "0 8 * * *" } },
  async ({ step }) => {
    const result = await step.run("send-holiday-notifications", () =>
      sendHolidayNotifications()
    );
    return result;
  }
);
