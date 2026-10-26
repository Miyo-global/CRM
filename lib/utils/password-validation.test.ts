import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "@/lib/password-utils";
import {
  PASSWORD_IDENTITY_MESSAGE,
  PASSWORD_REGEX,
  PASSWORD_ZOD_SCHEMA,
  passwordChecks,
  passwordIdentityIssue,
  passwordIssue,
  passwordSchema,
} from "./password-validation";
describe("special characters (QA-0067)", () => {
  it("accepts common punctuation and a space", () => {
    for (const pw of ["QaUser#2026Pw", "QaUser_2026Pw", "QaUser-2026Pw", "Qa User 2026Pw"]) {
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
    }
  });

  it("accepts the MIYO-0093 examples on both the schema and the form regex", () => {
    for (const pw of ["Abcdef1#", "Abcdef1_"]) {
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
      expect(PASSWORD_REGEX.test(pw)).toBe(true);
    }
  });

  it("still requires eight characters and a symbol", () => {
    expect(PASSWORD_ZOD_SCHEMA.safeParse("Ab1#").success).toBe(false);
    expect(PASSWORD_ZOD_SCHEMA.safeParse("QaUser2026Pwd").success).toBe(false);
    expect(PASSWORD_REGEX.test("QaUser2026Pwd")).toBe(false);
  });
});

describe("client checklist and server agree (QA-BUG-03)", () => {
  it("treats ! and - as symbols everywhere", () => {
    for (const pw of ["QaUser!2026", "QaUser-2026", "Qa€User2026"]) {
      expect(Object.values(passwordChecks(pw)).every(Boolean)).toBe(true);
      expect(getPasswordStrength(pw).level).toBe("strong");
      expect(PASSWORD_REGEX.test(pw)).toBe(true);
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
    }
  });

  it("a green checklist always means the server accepts", () => {
    for (const pw of ["abc", "ABCDEFGH1!", "Abcdefgh!", "Abcdefg1", "A".repeat(130) + "a1!"]) {
      const allGreen = Object.values(passwordChecks(pw)).every(Boolean);
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(allGreen);
      expect(PASSWORD_REGEX.test(pw)).toBe(allGreen);
    }
  });
});

describe("one specific message per rule (R3-ACC-01)", () => {
  const msg = (pw: string) => PASSWORD_ZOD_SCHEMA.safeParse(pw).error?.issues[0]?.message;

  it("names the rule that failed", () => {
    expect(msg("Ab1#")).toBe("Password must be at least 8 characters");
    expect(msg("Aa1!" + "x".repeat(125))).toBe("Maximum 128 characters");
    expect(msg("abcdefg1!")).toBe("Password must contain an uppercase letter");
    expect(msg("ABCDEFG1!")).toBe("Password must contain a lowercase letter");
    expect(msg("Abcdefgh!")).toBe("Password must contain a number");
    expect(msg("Abcdefgh1")).toBe("Password must contain a symbol or space");
  });

  it("whitespace-only asks for a non-space character, not an uppercase letter (R3-SET-04)", () => {
    expect(msg("        ")).toBe("Password must contain a non-space character");
  });

  it("returns exactly one issue", () => {
    expect(PASSWORD_ZOD_SCHEMA.safeParse("a").error?.issues).toHaveLength(1);
  });
});

describe("password must not contain email or name (R3-SET-01)", () => {
  const who = { email: "Priya.Sharma@maxxspace.com", firstName: "Priya", lastName: "Sharma" };

  it("rejects the full email, its local part, first or last name, any case", () => {
    for (const pw of ["Priya.Sharma@maxxspace.com1!A", "X1!priya.sharmaZ", "PRIYA#2026x", "Sharma#2026x"]) {
      expect(passwordIdentityIssue(pw, who)).toBe(PASSWORD_IDENTITY_MESSAGE);
      expect(passwordSchema(who).safeParse(pw).error?.issues[0]?.message).toBe(PASSWORD_IDENTITY_MESSAGE);
    }
  });

  it("splits a display name when first/last are unknown", () => {
    expect(passwordIdentityIssue("Sharma#2026x", { email: "ps@x.io", name: "Priya Sharma" })).toBe(PASSWORD_IDENTITY_MESSAGE);
  });

  it("accepts an unrelated password and ignores parts under three characters", () => {
    expect(passwordIdentityIssue("Tangerine#2026", who)).toBeNull();
    expect(passwordIdentityIssue("Jolly#2026x", { email: "jo@x.io", firstName: "Al" })).toBeNull();
  });

  it("strength rules come first", () => {
    expect(passwordIssue("priya", who)).toBe("Password must be at least 8 characters");
  });
});

describe("leading or trailing spaces (FR1-018)", () => {
  it("are refused with a clear message", async () => {
    const { validatePasswordStrength, PASSWORD_ZOD_SCHEMA } = await import("./password-validation");
    for (const pw of [" Abcdef1!x", "Abcdef1!x ", "  Abcdef1!x  "]) {
      expect(validatePasswordStrength(pw).valid).toBe(false);
      expect(validatePasswordStrength(pw).missing).toContain("Password can't start or end with a space");
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(false);
    }
  });

  it("never show as Strong in the meter", () => {
    expect(getPasswordStrength(" Abcdef1!x").level).toBe("weak");
    expect(getPasswordStrength("Abcdef1!x").level).toBe("strong");
  });

  it("still allow spaces inside", async () => {
    const { validatePasswordStrength } = await import("./password-validation");
    expect(validatePasswordStrength("Abc def1!x").valid).toBe(true);
  });
});
