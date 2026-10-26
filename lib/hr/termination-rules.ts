import { z } from "zod";
import { addDaysToDateString, getTodayString, isDateOnly, formatCalendarDate } from "@/lib/date-utils";
import { OTHER_TERMINATION_REASON } from "@/lib/constants/hr-separation";
import { TERMINATION_EXPLANATION_MAX, TERMINATION_NOTES_MAX } from "@/lib/validations/termination-reasons";

/**
 * A termination in one of these states is "open": at most one per employee
 * (R3-ADM-07). The partial unique index in drizzle/0191 uses the same list.
 * REJECTED and CANCELLED are closed; COMPLETED is history.
 */
export const OPEN_TERMINATION_STATUSES = ["DRAFT", "PENDING_CEO", "APPROVED", "SENT"] as const;

/** Statuses an Admin/HR can still edit or delete outright. */
export const EDITABLE_TERMINATION_STATUSES = ["DRAFT"] as const;

/** Submitted but not yet sent to the employee: the initiator can cancel it. */
export const CANCELLABLE_TERMINATION_STATUSES = ["PENDING_CEO", "APPROVED"] as const;

export const MAX_TERMINATION_LEAD_DAYS = 365;

/**
 * R3-ADM-02: the effective date is a real "YYYY-MM-DD", not before today in
 * the organisation timezone (unless the caller may backdate) and at most a
 * year ahead. Returns the message to show, or null when the date is fine.
 */
export function terminationDateError(
  effectiveDate: string,
  opts: { canBackdate: boolean; today?: string; joiningDate?: string | null },
): string | null {
  if (!isDateOnly(effectiveDate)) return "Effective date must be a valid date.";
  // Nobody leaves before they joined, backdated or not (FR1-015).
  const joined = opts.joiningDate?.slice(0, 10);
  if (joined && isDateOnly(joined) && effectiveDate < joined) {
    return `Effective date cannot be before the joining date (${formatCalendarDate(joined)}).`;
  }
  const today = opts.today ?? getTodayString();
  if (!opts.canBackdate && effectiveDate < today) {
    return "Effective date cannot be in the past. Only the Super Admin can backdate a termination.";
  }
  const latest = addDaysToDateString(today, MAX_TERMINATION_LEAD_DAYS);
  if (effectiveDate > latest) return "Effective date can be at most one year from today.";
  return null;
}

/**
 * Who cannot get a new termination: anyone with an open one, and anyone whose
 * completed termination is still ahead of or on today (account not closed
 * yet). An older completed one followed by a re-hire does not count.
 */
export function blocksNewTermination(
  t: { status: string | null; effectiveDate: string | null },
  today: string = getTodayString(),
): boolean {
  if ((OPEN_TERMINATION_STATUSES as readonly string[]).includes(t.status ?? "")) return true;
  return t.status === "COMPLETED" && String(t.effectiveDate ?? "").slice(0, 10) >= today;
}

/** The editable fields of a termination, shared by create and draft edit. */
export const terminationFieldsSchema = z.object({
  reasons: z.array(z.string().min(1)).min(1, "At least one reason is required"),
  detailedExplanation: z
    .string()
    .min(1, "Detailed explanation is required")
    .max(TERMINATION_EXPLANATION_MAX, `Detailed explanation must be at most ${TERMINATION_EXPLANATION_MAX} characters`),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date is required"),
  severanceAmount: z.number().nonnegative().optional(),
  noticePeriodWaived: z.boolean().optional().default(false),
  internalNotes: z
    .string()
    .max(TERMINATION_NOTES_MAX, `Internal notes must be at most ${TERMINATION_NOTES_MAX} characters`)
    .optional(),
  evidenceUrls: z.array(z.string().url()).max(20, "Too many evidence files").optional(),
});

export function requireExplanationForOther(
  data: { reasons?: string[]; detailedExplanation?: string },
  ctx: z.RefinementCtx,
): void {
  if (
    data.reasons?.includes(OTHER_TERMINATION_REASON) &&
    (data.detailedExplanation ?? "").trim().length < 50
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["detailedExplanation"],
      message: "A detailed explanation (min 50 characters) is required when 'Other' is selected.",
    });
  }
}
