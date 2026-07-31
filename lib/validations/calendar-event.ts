/**
 * Pure validation/derivation helpers for the Calendar → Add/Edit Event form.
 * Kept free of React so they can be unit-tested in isolation.
 */

import { parseISO } from "date-fns";
import { isAllowedName, NAME_ALLOWED_HINT, sanitizeName } from "./text-rules";

export const CALENDAR_TITLE_MIN = 5;
export const CALENDAR_TITLE_MAX = 100;
export const CALENDAR_DESC_MAX = 2000;
/** Minimum span for timed (non–all-day) events — keep in sync with API validation. */
export const CALENDAR_MIN_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const CALENDAR_MIN_DURATION_MINUTES = CALENDAR_MIN_DURATION_MS / 60_000;

export const CALENDAR_TITLE_NUMERIC_ONLY_ERROR =
  "Title cannot contain only numeric values. Please enter a valid title.";

/** Strip disallowed characters and cap length (same rules as {@link validateCalendarTitle}). */
export function sanitizeCalendarTitleInput(raw: string): string {
  return sanitizeName(raw).slice(0, CALENDAR_TITLE_MAX);
}

/**
 * Validate an event title. Returns an error message, or null when valid.
 * Rejects empty, too-short, too-long, disallowed characters, and numeric-/symbol-only titles (must contain a letter).
 */
export function validateCalendarTitle(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Title is required";
  if (trimmed.length < CALENDAR_TITLE_MIN) {
    return `Title must be at least ${CALENDAR_TITLE_MIN} characters`;
  }
  if (trimmed.length > CALENDAR_TITLE_MAX) {
    return `Title must be at most ${CALENDAR_TITLE_MAX} characters`;
  }
  if (/^[\d\s]+$/.test(trimmed) && /\d/.test(trimmed)) {
    return CALENDAR_TITLE_NUMERIC_ONLY_ERROR;
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return "Title must contain at least one letter";
  }
  if (!isAllowedName(trimmed)) {
    return `Title can only contain ${NAME_ALLOWED_HINT}`;
  }
  return null;
}

/**
 * Whether the Google Meet "Connect" affordance should be offered to the user.
 * Only when the integration is configured by the admin (env present) AND the
 * user has not already connected their Google account. When the integration is
 * not configured we hide the button entirely so the user is never redirected to
 * the OAuth start endpoint (which returns a bare "Google OAuth not configured"
 * JSON error page).
 */
export function shouldShowMeetConnect(status: {
  configured?: boolean;
  connected?: boolean;
} | null | undefined): boolean {
  if (!status) return false;
  return !!status.configured && !status.connected;
}

/** Whether the "Generate Meet link" button should be offered. */
export function shouldShowMeetGenerate(status: {
  configured?: boolean;
  connected?: boolean;
} | null | undefined): boolean {
  if (!status) return false;
  return !!status.configured && !!status.connected;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates parsed event bounds (API / DB). All-day: end must not be before start.
 * Timed: end must be strictly after start, span ≥ {@link CALENDAR_MIN_DURATION_MS}.
 */
export function getCalendarEventRangeError(
  start: Date,
  end: Date,
  allDay: boolean
): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid start or end date";
  }
  if (allDay) {
    if (end < start) {
      return "End date must be on or after start date";
    }
    return null;
  }
  if (end.getTime() <= start.getTime()) {
    return "End time must be after start time";
  }
  if (end.getTime() - start.getTime() < CALENDAR_MIN_DURATION_MS) {
    return `Event must be at least ${CALENDAR_MIN_DURATION_MINUTES} minutes long`;
  }
  return null;
}

/** Live validation for the event form date/time fields (before all-day end-of-day expansion). */
export function getCalendarEventFormRangeError(params: {
  allDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}): string | null {
  if (params.allDay) {
    const startDay = parseISO(`${params.startDate}T00:00:00`);
    const endDay = parseISO(`${params.endDate}T00:00:00`);
    if (Number.isNaN(startDay.getTime()) || Number.isNaN(endDay.getTime())) {
      return "Invalid date";
    }
    if (endDay < startDay) {
      return "End date cannot be before start date";
    }
    return null;
  }
  if (!params.startTime.trim()) {
    return "Start time is required";
  }
  if (!params.endTime.trim()) {
    return "End time is required";
  }
  const start = parseISO(`${params.startDate}T${params.startTime}`);
  const end = parseISO(`${params.endDate}T${params.endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date or time";
  }
  return getCalendarEventRangeError(start, end, false);
}
