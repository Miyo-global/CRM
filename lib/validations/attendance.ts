import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  /** Ignored: the punch date is always the org-timezone today (R3-EMP-01). Kept so older clients still validate. */
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
