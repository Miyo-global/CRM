import { z } from "zod";
import { CALENDAR_TITLE_MAX, CALENDAR_TITLE_MIN } from "./calendar-event";

/** POST body / PUT partial `title` for calendar events (trimmed, otherwise as typed; QA-BUG-18). */
export const calendarEventTitleSchema = z
  .string()
  .trim()
  .min(CALENDAR_TITLE_MIN, `Title must be at least ${CALENDAR_TITLE_MIN} characters`)
  .max(CALENDAR_TITLE_MAX, `Title must be at most ${CALENDAR_TITLE_MAX} characters`)
  .refine((v) => /\p{L}/u.test(v), "Title must contain at least one letter");
