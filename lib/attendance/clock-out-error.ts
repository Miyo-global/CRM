/**
 * Clock-out is refused until today's work log is saved. The toast says so and
 * opens the work log, on the attendance page (V5-0010) and the dashboard
 * clock widget alike (FR1-030).
 */
export function clockOutErrorToastOptions(
  message: string,
  openWorkLogs: () => void,
): { action: { label: string; onClick: () => void } } | undefined {
  return /work log/i.test(message) ? { action: { label: "Open work log", onClick: openWorkLogs } } : undefined;
}

export const WORK_LOGS_PATH = "/hr/work-logs";
