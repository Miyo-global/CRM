import { describe, expect, it } from "vitest";
import { hiringFlowFormSchema, mapHiringFlowFormErrors } from "@/lib/validations/hiring-flow";

const validRound = {
  roundOrder: 1,
  name: "Technical Interview",
  type: "TECHNICAL" as const,
  mode: "VIDEO" as const,
  durationMinutes: 60,
  slaDays: 3,
};

describe("hiringFlowFormSchema", () => {
  it("accepts a valid hiring flow", () => {
    const parsed = hiringFlowFormSchema.safeParse({
      name: "Sales standard flow",
      description: "For sales hires",
      isDefault: false,
      rounds: [validRound],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short name and missing round name", () => {
    const parsed = hiringFlowFormSchema.safeParse({
      name: "A",
      description: "",
      isDefault: false,
      rounds: [{ ...validRound, name: "" }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = mapHiringFlowFormErrors(parsed.error.issues);
      expect(errors.name).toBeTruthy();
      expect(errors.roundByIndex?.[0]?.name).toBeTruthy();
    }
  });

  it("rejects out-of-range duration and duplicate round names", () => {
    const parsed = hiringFlowFormSchema.safeParse({
      name: "Engineering flow",
      description: "",
      isDefault: false,
      rounds: [
        validRound,
        { ...validRound, roundOrder: 2, durationMinutes: 10 },
        { ...validRound, roundOrder: 3, name: "technical interview" },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = mapHiringFlowFormErrors(parsed.error.issues);
      expect(errors.roundByIndex?.[1]?.durationMinutes).toMatch(/at least 15/);
      expect(errors.roundByIndex?.[2]?.name).toMatch(/unique/i);
    }
  });
});
