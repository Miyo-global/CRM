"use server";

import { logger } from "@/lib/logger";
import { sendCelebrationGreetings } from "@/lib/hr/send-celebration-greetings";

/**
 * Daily greetings run from the cron route.
 *
 * It used to send a "Company Announcement / Dear Team" email about the
 * celebrant's birthday to every inbox in the org, and no personal wish to the
 * celebrant (QA-0012). It now runs the same personal-greeting path as the
 * Inngest schedule, which is idempotent per person, per kind, per year.
 */
export async function sendDailyNotifications() {
  try {
    const result = await sendCelebrationGreetings();
    logger.info("Daily notifications processed", result);
    return {
      birthdayCount: result.birthdays,
      leaveCount: 0,
      anniversaryCount: result.anniversaries,
    };
  } catch (error) {
    logger.error("Failed to process daily notifications", error);
    throw error;
  }
}
