import { after } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Runs follow-up work (emails, notifications) once the response is sent.
 *
 * An un-awaited promise can be cut off when a serverless function returns,
 * and the old `.catch(() => {})` hid every failure, so leave, helpdesk and
 * task emails went missing without a trace (R3-0009, V5-ARCH-006). after()
 * keeps the function alive until the work finishes; failures are logged.
 * Outside a request (tests, jobs) it just runs the work.
 */
export function afterResponse(label: string, work: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await work();
    } catch (error) {
      logger.error(`${label} failed`, { error });
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
