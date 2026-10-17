import { beforeAll, describe, expect, it } from "vitest";
import { users, accounts } from "@/lib/db/schema";

beforeAll(() => {
  process.env.ENCRYPTION_KEY ??= "test-only-key";
});

describe("encrypted PII columns (SEC-0006)", () => {
  it("stores tax id as ciphertext and reads it back", () => {
    const stored = users.taxId.mapToDriverValue("ABCDE1234F") as string;
    expect(stored.startsWith("enc:v1:")).toBe(true);
    expect(users.taxId.mapFromDriverValue(stored)).toBe("ABCDE1234F");
  });

  it("reads legacy plaintext unchanged", () => {
    expect(users.taxId.mapFromDriverValue("ABCDE1234F")).toBe("ABCDE1234F");
    const legacy = { accountNumber: "123", bankName: "X", branch: "Y", ifsc: "Z", accountHolder: "Q" };
    expect(users.bankDetails.mapFromDriverValue(JSON.stringify(legacy))).toEqual(legacy);
    expect(users.bankDetails.mapFromDriverValue(legacy)).toEqual(legacy);
  });

  it("round-trips bank details through jsonb ciphertext", () => {
    const bank = { accountNumber: "0001112223", bankName: "HDFC", branch: "Hyd", ifsc: "HDFC0001", accountHolder: "QA" };
    const stored = users.bankDetails.mapToDriverValue(bank) as string;
    expect(stored).not.toContain("0001112223");
    expect(users.bankDetails.mapFromDriverValue(stored)).toEqual(bank);
  });

  it("does not double-encrypt OAuth tokens", () => {
    const once = accounts.refresh_token.mapToDriverValue("1//token") as string;
    expect(accounts.refresh_token.mapToDriverValue(once)).toBe(once);
    expect(accounts.refresh_token.mapFromDriverValue(once)).toBe("1//token");
  });
});
