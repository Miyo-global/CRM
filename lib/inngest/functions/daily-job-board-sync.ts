

import { inngest } from "../client";
import { logger } from "@/lib/logger";

export const dailyJobBoardSync = inngest.createFunction(
  { id: "daily-job-board-sync", name: "Daily Job Board Sync", triggers: { cron: "0 0 * * *" } },
  async () => {
    logger.info("[daily-job-board-sync] Job board API sync is not yet configured. Skipping.");
    return { skipped: true, reason: "integration_not_configured" };
  }
);
