import { eachDayOfInterval, format, isSunday, startOfDay } from "date-fns";
import { z } from "zod";
import { getTodayString } from "@/lib/date-utils";

export const leaveRequestPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const dateStringSchema = z
  .string()
  .min(1, "Date is required")
  .refine((value) => isValidLocalDateString(value), "Invalid date");

const leaveAttachmentSchema = z.string().url("Attachment must be a valid URL");

export const MAX_LEAVE_ATTACHMENTS = 1;

/** Parse YYYY-MM-DD (or ISO prefix) as local calendar date — avoids UTC off-by-one. */
export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

function isValidLocalDateString(value: string): boolean {
  if (!value.trim()) return false;
  const d = parseLocalDate(value);
  return !Number.isNaN(d.getTime());
}

export function calculateLeaveWorkingDays({
  startDate,
  endDate,
  isHalfDay,
}: {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}): number {
  if (isHalfDay) return 0.5;
  if (!startDate.trim() || !endDate.trim()) return 0;
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  const days = eachDayOfInterval({ start, end });

  return days.filter((day) => !isSunday(day)).length;
}

/** Working days between start and end (inclusive), as YYYY-MM-DD strings. */
export function enumerateWorkingDateStrings(startDate: string, endDate: string): string[] {
  if (!isValidLocalDateString(startDate) || !isValidLocalDateString(endDate)) return [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (end < start) return [];
  return eachDayOfInterval({ start, end })
    .filter((day) => !isSunday(day))
    .map((day) => format(day, "yyyy-MM-dd"));
}

export interface WfhRequestSchemaOptions {
  /** Earliest allowed date (YYYY-MM-DD). Defaults to today (org timezone). */
  minStartDate?: string;
  /** Employee joining date (YYYY-MM-DD). WFH cannot start before this date. */
  joiningDate?: string | null;
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function maxDateOnly(a: string, b: string): string {
  return a > b ? a : b;
}

export function resolveWfhMinStartDate(options: WfhRequestSchemaOptions = {}): {
  minStartDate: string;
  joiningDate: string | null;
} {
  const todayStr = getTodayString();
  const baseMin = options.minStartDate ?? todayStr;
  const joiningDate = options.joiningDate ? toDateOnly(options.joiningDate) : null;
  const minStartDate = joiningDate ? maxDateOnly(baseMin, joiningDate) : baseMin;
  return { minStartDate, joiningDate };
}

function wfhBeforeMinMessage(
  date: string,
  ctx: { minStartDate: string; joiningDate: string | null; todayStr: string },
): string {
  if (ctx.joiningDate && date < ctx.joiningDate) {
    return "WFH cannot be requested before your joining date";
  }
  if (ctx.minStartDate > ctx.todayStr) {
    return "You already have WFH for today — select a future date";
  }
  return "Start date cannot be in the past";
}

export const WFH_OTHER_REASON = "Other";
const WFH_OTHER_NOTES_MIN_LENGTH = 10;

interface LeaveValidationHooks {
  getAvailableBalance?: (leaveTypeId: string, requestedDays: number) => number | null | undefined;
}

export function createLeaveRequestSchema(hooks: LeaveValidationHooks = {}) {
  return z
    .object({
      leaveTypeId: z.string().min(1, "Leave type is required"),
      startDate: dateStringSchema,
      endDate: dateStringSchema,
      halfDay: z.boolean(),
      halfDayPeriod: z.enum(["AM", "PM"]).optional(),
      priority: leaveRequestPrioritySchema,
      reason: z
        .string()
        .trim()
        .min(1, "Reason is required")
        .max(500, "Reason must be 500 characters or less"),
      attachments: z.array(leaveAttachmentSchema).max(
        MAX_LEAVE_ATTACHMENTS,
        `You can upload at most ${MAX_LEAVE_ATTACHMENTS} attachment`,
      ),
    })
    .superRefine((data, ctx) => {
      const start = parseLocalDate(data.startDate);
      const end = parseLocalDate(data.endDate);
      const datesValid =
        isValidLocalDateString(data.startDate) && isValidLocalDateString(data.endDate);

      if (datesValid && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To date must be after or equal to from date",
          path: ["endDate"],
        });
      }

      const now = startOfDay(new Date());
      const minStart = new Date(now);
      minStart.setFullYear(now.getFullYear() - 1);
      const maxEnd = new Date(now);
      maxEnd.setFullYear(now.getFullYear() + 1);
      if (datesValid && start < minStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date is too far in the past",
          path: ["startDate"],
        });
      }
      if (datesValid && end > maxEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be more than a year in the future",
          path: ["endDate"],
        });
      }

      if (data.halfDay && data.startDate !== data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half-day leave can only be requested for one day",
          path: ["halfDay"],
        });
      }

      if (data.halfDay && !data.halfDayPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a half-day period",
          path: ["halfDayPeriod"],
        });
      }

      if (!data.halfDay && data.halfDayPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half-day period is only allowed for half-day leave",
          path: ["halfDayPeriod"],
        });
      }

      if (!datesValid || end < start) {
        return;
      }

      const requestedDays = calculateLeaveWorkingDays({
        startDate: data.startDate,
        endDate: data.endDate,
        isHalfDay: data.halfDay,
      });

      if (requestedDays <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selected dates fall on a weekend. Please choose a working day.",
          path: ["startDate"],
        });
      }

      if (hooks.getAvailableBalance) {
        const available = hooks.getAvailableBalance(data.leaveTypeId, requestedDays);
        if (typeof available === "number" && requestedDays > available) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Insufficient balance. Available: ${available} day(s)`,
            path: ["leaveTypeId"],
          });
        }
      }
    });
}

export function createWfhRequestSchema(options: WfhRequestSchemaOptions = {}) {
  const todayStr = getTodayString();
  const { minStartDate, joiningDate } = resolveWfhMinStartDate(options);

  return z
    .object({
      startDate: dateStringSchema,
      endDate: dateStringSchema,
      reason: z.string().trim().min(1, "Reason is required"),
      notes: z.string().trim().max(500, "Notes must be 500 characters or less").optional(),
    })
    .superRefine((data, ctx) => {
      const datesValid =
        isValidLocalDateString(data.startDate) && isValidLocalDateString(data.endDate);

      if (!datesValid) return;

      const start = parseLocalDate(data.startDate);
      const end = parseLocalDate(data.endDate);
      const maxEnd = parseLocalDate(todayStr);
      maxEnd.setFullYear(maxEnd.getFullYear() + 1);
      const maxEndStr = format(maxEnd, "yyyy-MM-dd");
      const boundCtx = { minStartDate, joiningDate, todayStr };

      if (data.startDate < minStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: wfhBeforeMinMessage(data.startDate, boundCtx),
          path: ["startDate"],
        });
      }
      if (data.endDate < minStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: wfhBeforeMinMessage(data.endDate, boundCtx),
          path: ["endDate"],
        });
      }
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be before start date",
          path: ["endDate"],
        });
        return;
      }
      if (data.endDate > maxEndStr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be more than a year in the future",
          path: ["endDate"],
        });
        return;
      }

      const workingDays = enumerateWorkingDateStrings(data.startDate, data.endDate);
      if (workingDays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WFH request cannot be submitted only for weekend days.",
          path: ["startDate"],
        });
        return;
      }

      const pastDay = workingDays.find((day) => day < minStartDate);
      if (pastDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: wfhBeforeMinMessage(pastDay, boundCtx),
          path: ["startDate"],
        });
      }

      if (data.reason === WFH_OTHER_REASON) {
        const notes = data.notes?.trim() ?? "";
        if (!notes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please describe your reason when selecting Other",
            path: ["notes"],
          });
        } else if (notes.length < WFH_OTHER_NOTES_MIN_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Please provide more detail (at least ${WFH_OTHER_NOTES_MIN_LENGTH} characters)`,
            path: ["notes"],
          });
        }
      }
    });
}
