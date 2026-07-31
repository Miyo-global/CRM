"use server";

function istYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

function yesterdayIstYmd(): string {
  return istYmd(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/** Short-hour half-day payroll rule removed — cron kept as no-op for compatibility. */
export async function notifyShortHoursEmployees() {
  return {
    processed: 0,
    date: yesterdayIstYmd(),
    message: "Short-hour half-day payroll rule is disabled",
  };
}
