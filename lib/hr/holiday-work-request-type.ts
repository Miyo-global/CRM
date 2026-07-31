export type HolidayWorkRequestType = "HOLIDAY" | "SUNDAY" | "SATURDAY";

export type ResolveHolidayWorkRequestTypeResult =
  | { ok: true; type: HolidayWorkRequestType; isHrHoliday: boolean }
  | { ok: false; reason: "not_a_non_working_day" };

export function resolveHolidayWorkRequestType(
  requestDateYyyyMmDd: string,
  matchedHrHoliday: { id: number } | null | undefined
): ResolveHolidayWorkRequestTypeResult {
  const d = new Date(requestDateYyyyMmDd + "T00:00:00");
  const dow = d.getDay();
  const isSunday = dow === 0;
  const isSaturday = dow === 6;
  const isHrHoliday = !!matchedHrHoliday;

  if (!isHrHoliday && !isSunday && !isSaturday) {
    return { ok: false, reason: "not_a_non_working_day" };
  }

  const type: HolidayWorkRequestType = isHrHoliday ? "HOLIDAY" : isSunday ? "SUNDAY" : "SATURDAY";
  return { ok: true, type, isHrHoliday };
}
