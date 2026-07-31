export const AUTO_CHECKOUT_IST_HOUR = 19;
export const DEFAULT_AUTO_CHECKOUT_BREAK_HOURS = 1;

const IST_OFFSET_MINUTES = 330;

export function istSevenPmUtcForDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid attendance date string: ${dateStr}`);
  }
  const istMinutesFromMidnight = AUTO_CHECKOUT_IST_HOUR * 60;
  const utcMinutesFromMidnight = istMinutesFromMidnight - IST_OFFSET_MINUTES;
  const utcHours = Math.floor(utcMinutesFromMidnight / 60);
  const utcMinutes = utcMinutesFromMidnight % 60;
  return new Date(Date.UTC(year, month - 1, day, utcHours, utcMinutes, 0, 0));
}
