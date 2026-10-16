import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodErrorMessage } from "./zod-message";

function messageFor(schema: z.ZodType, value: unknown): string {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("expected a validation failure");
  return zodErrorMessage(result.error);
}

describe("zodErrorMessage (QA-D005)", () => {
  it("names the field and says what is wrong", () => {
    const schema = z.object({ points: z.number().min(0) });
    expect(messageFor(schema, { points: -5 })).toBe("Points: Use 0 or more.");
  });

  it("reports a missing value as required", () => {
    const schema = z.object({ startDate: z.string() });
    expect(messageFor(schema, {})).toBe("Start date: This is required.");
  });

  it("keeps a message written in the schema", () => {
    const schema = z.object({ reason: z.string().min(1, "Give a reason for the rejection.") });
    expect(messageFor(schema, { reason: "" })).toBe("Reason: Give a reason for the rejection.");
  });

  it("never leaks expected/received wording", () => {
    const schema = z.object({ amount: z.number() });
    expect(messageFor(schema, { amount: "abc" })).not.toMatch(/expected|received/i);
  });
});
