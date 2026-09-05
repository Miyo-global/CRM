import { z } from "zod";
import { getTodayString } from "@/lib/date-utils";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How far a client-supplied `localDate` may sit from the server's own date
 * before it is ignored. One day covers every real timezone offset (UTC-12 to
 * UTC+14) while stopping a caller from back- or post-dating a punch.
 */
export const MAX_PUNCH_DATE_SKEW_MS = 24 * 60 * 60 * 1000;

/**
 * GPS coordinates captured at punch time. This lands in the `location_data`
 * jsonb column, so it is bounded here — an unvalidated object would let any
 * authenticated caller write arbitrary JSON of arbitrary size into the row.
 */
export const punchLocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
});

/**
 * Body shared by check-in and check-out. Unknown keys are stripped rather than
 * rejected, so an older client sending extra fields keeps working.
 */
export const attendancePunchSchema = z.object({
  localDate: z.string().regex(ISO_DATE_RE, "localDate must be YYYY-MM-DD").optional(),
  location: punchLocationSchema.nullish(),
});

export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;

/**
 * Parses a punch body, falling back to an empty object when the request has no
 * JSON body at all. Both punch routes accept a bodyless POST.
 */
export function parseAttendancePunchBody(raw: unknown): AttendancePunchInput {
  return attendancePunchSchema.parse(raw ?? {});
}

/**
 * Resolves the date a punch belongs to.
 *
 * The client sends its own local date so someone punching in just after
 * midnight in a timezone ahead of the server is not recorded against the
 * previous day. Anything further than a day from the server's date is treated
 * as wrong (or hostile) and the server date wins.
 */
export function resolvePunchDate(
  localDate: string | undefined,
  serverToday: string = getTodayString(),
): string {
  if (!localDate || !ISO_DATE_RE.test(localDate)) return serverToday;

  const supplied = new Date(`${localDate}T00:00:00`).getTime();
  const server = new Date(`${serverToday}T00:00:00`).getTime();
  if (!Number.isFinite(supplied)) return serverToday;

  return Math.abs(supplied - server) <= MAX_PUNCH_DATE_SKEW_MS ? localDate : serverToday;
}
