import { describe, expect, it } from "vitest";
import { EMAIL_ADDRESS_SCHEMA } from "./email-validation";

describe("invite email (R3-INV-10)", () => {
  const msg = (v: string) => EMAIL_ADDRESS_SCHEMA.safeParse(v).error?.issues[0]?.message;

  it("rejects 'notanemail' and 'a@b' with a readable message", () => {
    expect(msg("notanemail")).toBe("Enter a valid email address");
    expect(msg("a@b")).toBe("Enter a valid email address");
    expect(msg("")).toBe("Email is required");
  });

  it("caps the total at 254 and the local part at 64", () => {
    expect(msg(`${"a".repeat(243)}@example.com`)).toBe("Email must be at most 254 characters");
    expect(msg(`${"a".repeat(65)}@example.com`)).toBe("The part before @ must be at most 64 characters");
    expect(EMAIL_ADDRESS_SCHEMA.safeParse(`${"a".repeat(64)}@example.com`).success).toBe(true);
  });

  it("trims and lower-cases a valid address", () => {
    expect(EMAIL_ADDRESS_SCHEMA.parse("  QA.Test+r3@MaxxSpace.com ")).toBe("qa.test+r3@maxxspace.com");
  });
});
