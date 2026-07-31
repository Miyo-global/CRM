import { z } from "zod";
import { getTodayString } from "@/lib/date-utils";
import {
  cleanOptionalText,
  cleanOptionalName,
  cleanOptionalSimpleName,
  cleanRequiredName,
} from "@/lib/validations/text-rules";

export const MAX_EXPENSE_AMOUNT = 99_999;

export const expenseAmountSchema = z
  .number()
  .positive("Amount must be greater than 0")
  .max(
    MAX_EXPENSE_AMOUNT,
    `Amount must be at most ₹${MAX_EXPENSE_AMOUNT.toLocaleString("en-IN")}`,
  );

export const expensePaymentMethodSchema = cleanOptionalName("Payment method", 60);

export const createExpenseBodySchema = z
  .object({
    category: cleanRequiredName("Category", 60),
    categoryId: z.number().int().optional(),
    amount: expenseAmountSchema,
    description: cleanOptionalText("Description", 500),
    receiptUrl: z.string().optional(),
    receiptFileName: z.string().optional(),
    merchant: cleanOptionalSimpleName("Merchant", 100),
    paymentMethod: expensePaymentMethodSchema,
    projectId: z.number().int().optional(),
    expenseDate: z.string(),
  })
  .superRefine((data, ctx) => {
    validateExpenseDateNotFuture(data.expenseDate, ctx, ["expenseDate"]);
  });

export const updateExpenseDetailsSchema = z
  .object({
    category: cleanRequiredName("Category", 60).optional(),
    amount: expenseAmountSchema.optional(),
    description: cleanOptionalText("Description", 500).optional(),
    merchant: cleanOptionalSimpleName("Merchant", 100).optional(),
    paymentMethod: expensePaymentMethodSchema.optional(),
    expenseDate: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptFileName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expenseDate) {
      validateExpenseDateNotFuture(data.expenseDate, ctx, ["expenseDate"]);
    }
  });

function validateExpenseDateNotFuture(
  expenseDate: string,
  ctx: z.RefinementCtx,
  path: string[],
) {
  const parsed = new Date(expenseDate);
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expense date is invalid.",
      path,
    });
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  if (parsed > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expense date cannot be in the future.",
      path,
    });
  }
}

/** Inline validation for expense export date ranges (client + server). */
export function validateExpenseExportDateRange(
  startDate?: string,
  endDate?: string,
  todayStr = getTodayString(),
): string | null {
  if (startDate && endDate && startDate > endDate) {
    return "From date cannot be later than To date";
  }
  if (startDate && startDate > todayStr) {
    return "From date cannot be in the future — there is no expense data for future dates";
  }
  if (endDate && endDate > todayStr) {
    return "To date cannot be in the future — there is no expense data for future dates";
  }
  return null;
}

export type ExpenseUserRef = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
};

export function formatExpenseSubmitterLabel(
  user: ExpenseUserRef | null | undefined,
  currentUserId?: string,
  /** Submitter id on the expense row when `user.id` is missing from the payload. */
  submitterUserId?: string,
): string {
  const submitterId = user?.id ?? submitterUserId;
  if (currentUserId && submitterId && submitterId === currentUserId) {
    return "Created by Me";
  }
  if (!user) return submitterId ? "Unknown" : "Unknown";
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (fullName) return fullName;
  const name = user.name?.trim();
  if (name) return name;
  return user.email?.trim() || "Unknown";
}

export function formatEmployeeOptionLabel(e: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const fullName = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
  return fullName || e.name?.trim() || e.email || e.id;
}
