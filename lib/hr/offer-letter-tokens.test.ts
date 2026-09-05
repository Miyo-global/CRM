import { describe, expect, it } from "vitest";
import {
  applyOfferTokens,
  isValidVariableKey,
  normalizeVariableKey,
} from "./offer-letter-tokens";

describe("applyOfferTokens", () => {
  const vars = { candidateName: "Asha Rao", annualSalary: "Rs.12,00,000.00" };

  it("substitutes known tokens", () => {
    expect(applyOfferTokens("Dear {{candidateName}},", vars)).toBe("Dear Asha Rao,");
  });

  it("treats whitespace inside the braces as insignificant", () => {
    expect(applyOfferTokens("Dear {{ candidateName }},", vars)).toBe("Dear Asha Rao,");
    expect(applyOfferTokens("Dear {{\tcandidateName\t}},", vars)).toBe("Dear Asha Rao,");
  });

  it("does not leak inherited Object properties into the letter", () => {
    // `vars[key]` walks the prototype chain, so these keys resolve to real
    // functions rather than undefined — and `?? ""` never sees them. Left
    // unfixed, an offer letter containing {{toString}} ships the text
    // "function toString() { [native code] }" to a candidate.
    for (const key of ["toString", "constructor", "valueOf", "hasOwnProperty"]) {
      const out = applyOfferTokens(`Salary: {{${key}}}`, vars);
      expect(out).toBe("Salary: ");
    }
  });

  it("does not re-interpret a substituted value as another token", () => {
    const hostile = { candidateName: "{{annualSalary}}", annualSalary: "SECRET" };
    expect(applyOfferTokens("Dear {{candidateName}},", hostile)).toBe("Dear {{annualSalary}},");
  });

  it("leaves a dollar-sign in a value alone", () => {
    // `$&` and friends are only special for string replacements, not function
    // callbacks — pin the behaviour so a refactor cannot silently change it.
    expect(applyOfferTokens("{{candidateName}}", { candidateName: "$& $1 $$" })).toBe("$& $1 $$");
  });
});

describe("variable key rules", () => {
  it("accepts identifier-shaped keys and rejects the rest", () => {
    expect(isValidVariableKey("candidateName")).toBe(true);
    expect(isValidVariableKey("v1_x")).toBe(true);
    expect(isValidVariableKey("")).toBe(false);
    expect(isValidVariableKey("1leading")).toBe(false);
    expect(isValidVariableKey("has space")).toBe(false);
    expect(isValidVariableKey("a".repeat(65))).toBe(false);
  });

  it("normalises free text into a valid key", () => {
    expect(normalizeVariableKey("  Joining Date  ")).toBe("Joining_Date");
    expect(normalizeVariableKey("2nd manager")).toBe("v2nd_manager");
    expect(isValidVariableKey(normalizeVariableKey("Employee's e-mail!"))).toBe(true);
  });
});
