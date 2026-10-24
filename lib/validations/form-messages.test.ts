/**
 * Phase P1 acceptance (Round 3 QA): every form field below is fed '', ' ',
 * -1, 0, '12abc' and max+1 and must answer with a specific sentence a person
 * can act on: never Zod's own wording, never a silently changed value.
 */
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import "@/lib/api/zod-message";
import { formatZodError } from "@/lib/api/zod-message";
import { parseAmountInput, formatAmountLimit } from "@/lib/numeric-input";
import { createExpenseBodySchema, MAX_EXPENSE_AMOUNT } from "./expense";
import { bonusAmountSchema, BONUS_MAX_AMOUNT } from "./bonus";
import { assetCreateSchema, ASSET_PURCHASE_COST_MAX_INR } from "./hr-assets";
import { onboardEmployeeInputSchema, updateEmployeeProfileBodySchema, editEmployeeFormSchema } from "./hr";
import { TICKET_TITLE_MAX, ticketTitleSchema } from "./project";
import { helpdeskTicketSchema, HELPDESK_COMMENT_MAX } from "./common-forms";
import {
  TERMINATION_REASON_LABEL_MAX,
  terminationReasonLabelSchema,
  TERMINATION_NOTES_MAX,
  TERMINATION_EXPLANATION_MAX,
} from "./termination-reasons";
import { terminationFieldsSchema } from "@/lib/hr/termination-rules";

const ZOD_DEFAULTS = /expected|received|invalid input|\bnan\b|too small|too big|invalid_type/i;

function messageFor(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]!.message;
}

type AmountCase = {
  name: string;
  schema: z.ZodType;
  label: string;
  max: number;
  allowZero?: boolean;
  required?: boolean;
  maxSuffix?: string;
};

const MONTHLY_SALARY_MAX = 100_000_000;

const amountCases: AmountCase[] = [
  { name: "expense amount", schema: createExpenseBodySchema.shape.amount, label: "Amount", max: MAX_EXPENSE_AMOUNT, maxSuffix: " per claim" },
  { name: "bonus amount", schema: bonusAmountSchema, label: "Amount", max: BONUS_MAX_AMOUNT },
  { name: "asset purchase cost", schema: assetCreateSchema.shape.purchaseCost, label: "Purchase cost", max: ASSET_PURCHASE_COST_MAX_INR, allowZero: true },
  { name: "wizard monthly salary", schema: onboardEmployeeInputSchema.shape.monthlySalary, label: "Monthly salary", max: MONTHLY_SALARY_MAX },
  { name: "employee PATCH monthly salary", schema: updateEmployeeProfileBodySchema.shape.monthlySalary, label: "Monthly salary", max: MONTHLY_SALARY_MAX, required: false },
  { name: "edit form monthly salary", schema: editEmployeeFormSchema.shape.monthlySalary, label: "Monthly salary", max: MONTHLY_SALARY_MAX, required: false },
];

describe("money fields: specific messages, no silent mutation (R3-EMP-03, R3-HR-03)", () => {
  it("parses typed text without rewriting it", () => {
    expect(parseAmountInput("-5")).toBe(-5);
    expect(parseAmountInput("12abc")).toBeNaN();
    expect(parseAmountInput("1,500")).toBe(1500);
    expect(parseAmountInput("  ")).toBeUndefined();
  });

  for (const c of amountCases) {
    describe(c.name, () => {
      const required = c.required !== false;
      const expected: [unknown, string | null][] = [
        ["", required ? `${c.label} is required` : null],
        [" ", required ? `${c.label} is required` : null],
        [-1, c.allowZero ? `${c.label} cannot be negative` : `${c.label} must be greater than 0`],
        ["-5000", c.allowZero ? `${c.label} cannot be negative` : `${c.label} must be greater than 0`],
        [0, c.allowZero ? null : `${c.label} must be greater than 0`],
        ["12abc", `${c.label} must be a number, e.g. 1500`],
        [c.max + 1, `${c.label} cannot exceed ${formatAmountLimit(c.max)}${c.maxSuffix ?? ""}`],
      ];
      for (const [input, message] of expected) {
        it(`${JSON.stringify(input)} -> ${message ?? "accepted"}`, () => {
          const got = messageFor(c.schema, input);
          expect(got).toBe(message);
          if (got) expect(got).not.toMatch(ZOD_DEFAULTS);
        });
      }
      it("keeps a valid amount as typed", () => {
        expect(c.schema.parse("1500")).toBe(1500);
      });
    });
  }
});

type TextCase = { name: string; schema: z.ZodType; max: number; required: string | null; tooLong: string };

const textCases: TextCase[] = [
  { name: "ticket title", schema: ticketTitleSchema, max: TICKET_TITLE_MAX, required: "Title is required", tooLong: `Title must be at most ${TICKET_TITLE_MAX} characters` },
  { name: "helpdesk title", schema: helpdeskTicketSchema.shape.title, max: 200, required: "Title must be at least 3 characters", tooLong: "Title must be at most 200 characters" },
  { name: "termination reason label", schema: terminationReasonLabelSchema, max: TERMINATION_REASON_LABEL_MAX, required: "Label is required", tooLong: `Label must be at most ${TERMINATION_REASON_LABEL_MAX} characters` },
  { name: "termination internal notes", schema: terminationFieldsSchema.shape.internalNotes, max: TERMINATION_NOTES_MAX, required: null, tooLong: `Internal notes must be at most ${TERMINATION_NOTES_MAX} characters` },
  { name: "termination explanation", schema: terminationFieldsSchema.shape.detailedExplanation, max: TERMINATION_EXPLANATION_MAX, required: "Detailed explanation is required", tooLong: `Detailed explanation must be at most ${TERMINATION_EXPLANATION_MAX} characters` },
  { name: "wizard job title", schema: onboardEmployeeInputSchema.shape.designation, max: 120, required: "Job title is required", tooLong: "Job title must be at most 120 characters" },
];

describe("text fields: required and max length say so (R3-EMP-04, R3-LEN-01, R3-PRJ-03)", () => {
  for (const c of textCases) {
    it(`${c.name}: '' / max+1`, () => {
      expect(messageFor(c.schema, "")).toBe(c.required);
      expect(messageFor(c.schema, "a".repeat(c.max + 1))).toBe(c.tooLong);
      expect(messageFor(c.schema, "a".repeat(c.max))).toBeNull();
    });
  }

  it("wizard job title of one letter names the field", () => {
    expect(messageFor(onboardEmployeeInputSchema.shape.designation, "a")).toBe("Job title must be at least 2 characters");
  });

  it("an Employee ID with symbols is an error naming the allowed set", () => {
    expect(messageFor(onboardEmployeeInputSchema.shape.employeeId, "!!@#$ %^")).toBe(
      "Employee ID must be 2–20 letters or numbers only",
    );
  });

  it("helpdesk reply limit is 5000", () => {
    expect(HELPDESK_COMMENT_MAX).toBe(5000);
  });
});

describe("wizard Department (R3-ONB-01)", () => {
  for (const input of [undefined, "", " ", 0, -1, "12abc", Number.NaN]) {
    it(`${String(input)} -> Department is required`, () => {
      expect(messageFor(onboardEmployeeInputSchema.shape.departmentId, input)).toBe("Department is required");
    });
  }
});

describe("central Zod error map", () => {
  it("words schema-less issues as '<Label> ...', never Zod defaults", async () => {
    const { z } = await import("zod");
    const schema = z.object({ firstName: z.string().min(2).max(5), age: z.number(), departmentId: z.number() });
    const result = schema.safeParse({ firstName: "a".repeat(6), age: "x" });
    expect(result.success).toBe(false);
    const { error, fields } = formatZodError(result.error!);
    expect(fields).toEqual({
      firstName: "First name must be at most 5 characters",
      age: "Age must be a number",
      departmentId: "Department is required",
    });
    expect(error).toBe("First name must be at most 5 characters");
    for (const m of Object.values(fields)) expect(m).not.toMatch(ZOD_DEFAULTS);
  });
});
