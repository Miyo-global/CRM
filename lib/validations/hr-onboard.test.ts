import { describe, expect, it } from "vitest";
import { onboardEmployeeInputSchema } from "./hr";
import { getMiyoGlobalEstablishedDate } from "@/lib/constants/company";

const validBase = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@miyoglobal.com",
  gender: "MALE" as const,
  phone: "+919876543210",
  whatsappSameAsPhone: true,
  designation: "Engineer",
  departmentId: 1,
  role: "ENGINEERING",
  joiningDate: new Date("2025-01-15"),
  dateOfBirth: new Date("1995-06-15"),
  bankDetails: {
    accountNumber: "1234567890",
    bankName: "HDFC Bank",
    branch: "Hyderabad",
    ifsc: "HDFC0001234",
    accountHolder: "John Doe",
  },
  monthlySalary: 50_000,
};

describe("onboardEmployeeInputSchema", () => {
  it("rejects invalid name spacing and length", () => {
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, firstName: "John  Doe" }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, firstName: "J" }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, firstName: "a".repeat(51) }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, firstName: " John " }).success).toBe(true);
  });

  it("rejects emails over 254 characters", () => {
    const longLocal = "a".repeat(250);
    const result = onboardEmployeeInputSchema.safeParse({
      ...validBase,
      email: `${longLocal}@test.com`,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone numbers", () => {
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, phone: "123" }).success).toBe(false);
    expect(
      onboardEmployeeInputSchema.safeParse({ ...validBase, phone: "+919876543210", whatsappSameAsPhone: false, whatsappNumber: "abc" }).success,
    ).toBe(false);
  });

  it("rejects DOB in the future or under minimum age (18)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, dateOfBirth: tomorrow }).success).toBe(false);

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 10);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, dateOfBirth: tooYoung }).success).toBe(false);

    const seventeen = new Date();
    seventeen.setFullYear(seventeen.getFullYear() - 17);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, dateOfBirth: seventeen }).success).toBe(false);

    const eighteen = new Date();
    eighteen.setFullYear(eighteen.getFullYear() - 18);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, dateOfBirth: eighteen }).success).toBe(true);
  });

  it("rejects joining date before company establishment", () => {
    const established = getMiyoGlobalEstablishedDate();
    const before = new Date(established);
    before.setDate(before.getDate() - 1);

    const result = onboardEmployeeInputSchema.safeParse({
      ...validBase,
      joiningDate: before,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("joiningDate"))).toBe(true);
    }
  });

  it("accepts a valid payload", () => {
    expect(onboardEmployeeInputSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects invalid employee IDs", () => {
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, employeeId: "V" }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, employeeId: "VC@25003" }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, employeeId: "a".repeat(21) }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, employeeId: "VC25003" }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, employeeId: "" }).success).toBe(true);
  });

  it("validates skills, experience, and salary", () => {
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, skills: "React" }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, skills: "React, Node.js" }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, skills: "React@" }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, experienceYears: 50.5 }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, experienceYears: 60 }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, experienceYears: 61 }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, experienceYears: 2.55 }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, experienceYears: 2.5 }).success).toBe(true);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, monthlySalary: undefined }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, monthlySalary: 0 }).success).toBe(false);
    expect(onboardEmployeeInputSchema.safeParse({ ...validBase, monthlySalary: 25000.5 }).success).toBe(false);
  });

  it("rejects invalid banking details", () => {
    expect(
      onboardEmployeeInputSchema.safeParse({
        ...validBase,
        bankDetails: { ...validBase.bankDetails, accountNumber: "123" },
      }).success,
    ).toBe(false);
    expect(
      onboardEmployeeInputSchema.safeParse({
        ...validBase,
        bankDetails: { ...validBase.bankDetails, ifsc: "HDFC00" },
      }).success,
    ).toBe(false);
    expect(
      onboardEmployeeInputSchema.safeParse({
        ...validBase,
        bankDetails: { ...validBase.bankDetails, swiftCode: "X" },
      }).success,
    ).toBe(false);
  });
});
