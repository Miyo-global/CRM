import { z } from "zod";
import { CALENDAR_TITLE_MAX, CALENDAR_TITLE_MIN } from "./calendar-event";
import { isAllowedName, NAME_ALLOWED_HINT } from "./text-rules";

/** POST body / PUT partial `title` for calendar events (trimmed). */
export const calendarEventTitleSchema = z
  .string()
  .trim()
  .min(CALENDAR_TITLE_MIN, `Title must be at least ${CALENDAR_TITLE_MIN} characters`)
  .max(CALENDAR_TITLE_MAX, `Title must be at most ${CALENDAR_TITLE_MAX} characters`)
  .refine((v) => /[a-zA-Z]/.test(v), "Title must contain at least one letter")
  .refine((v) => isAllowedName(v), `Title can only contain ${NAME_ALLOWED_HINT}`);
