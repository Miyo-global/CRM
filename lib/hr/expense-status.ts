import { z } from "zod";

/**
 * Status changes an approver can make on an expense claim (R3-HR-01).
 * "REIMBURSED" is what the UI calls it; the database enum stores PAID.
 */
export const expenseStatusUpdateSchema = z.object({
  status: z.preprocess(
    (v) => (v === "REIMBURSED" ? "PAID" : v),
    z.enum(["APPROVED", "REJECTED", "PAID"], {
      message: "Status must be Approved, Rejected or Reimbursed.",
    }),
  ),
  rejectionReason: z.string().trim().max(500, "Rejection reason must be at most 500 characters.").optional(),
});

export type ExpenseStatusUpdate = z.infer<typeof expenseStatusUpdateSchema>;

const NEXT: Record<string, readonly string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
};

/** Null when `from -> to` is allowed, otherwise the message to show. */
export function expenseTransitionError(from: string | null, to: ExpenseStatusUpdate["status"]): string | null {
  const current = from ?? "PENDING";
  if (NEXT[current]?.includes(to)) return null;
  if (current === "PAID") return "This claim has already been reimbursed.";
  if (to === "PAID") return "Only an approved claim can be marked reimbursed.";
  return "This claim has already been processed.";
}
