import { describe, expect, it } from "vitest";
import { bankDetailsSchema } from "./bank-details";

const validBankDetails = {
  accountNumber: "1234567890",
  bankName: "HDFC Bank",
  branch: "Hyderabad Main",
  ifsc: "HDFC0001234",
  accountHolder: "John Doe",
};

describe("bankDetailsSchema", () => {
  it("accepts valid Indian bank details", () => {
    expect(bankDetailsSchema.safeParse(validBankDetails).success).toBe(true);
  });

  it("rejects account numbers outside length bounds", () => {
    expect(
      bankDetailsSchema.safeParse({ ...validBankDetails, accountNumber: "1234567" }).success,
    ).toBe(false);
    expect(
      bankDetailsSchema.safeParse({ ...validBankDetails, accountNumber: "1".repeat(19) }).success,
    ).toBe(false);
  });

  it("rejects invalid IFSC, SWIFT, and IBAN values", () => {
    expect(
      bankDetailsSchema.safeParse({ ...validBankDetails, ifsc: "HDFC001" }).success,
    ).toBe(false);
    expect(
      bankDetailsSchema.safeParse({ ...validBankDetails, swiftCode: "BAD" }).success,
    ).toBe(false);
    expect(
      bankDetailsSchema.safeParse({ ...validBankDetails, iban: "INVALID" }).success,
    ).toBe(false);
  });

  it("accepts optional SWIFT and IBAN when valid", () => {
    expect(
      bankDetailsSchema.safeParse({
        ...validBankDetails,
        swiftCode: "HDFCINBB",
        iban: "DE89370400440532013000",
      }).success,
    ).toBe(true);
  });
});
