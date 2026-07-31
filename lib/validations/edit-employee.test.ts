import { describe, expect, it } from "vitest";
import { editEmployeeFormSchema, isRoleAllowedForDepartment } from "./hr";

const validEdit = {
  firstName: "John",
  lastName: "Doe",
  role: "ENGINEERING",
  designation: "Engineer",
  departmentId: 1,
  phone: "+919876543210",
  gender: "MALE" as const,
  joiningDate: new Date("2025-06-01"),
  experienceYears: 3,
  skills: "React, Node.js",
  taxId: "ABCDE1234F",
  monthlySalary: 50_000,
  bankAccount: "1234567890",
  bankName: "HDFC Bank",
  branch: "Hyderabad",
  ifsc: "HDFC0001234",
  accountHolder: "John Doe",
};

describe("editEmployeeFormSchema", () => {
  it("accepts valid employee edit data", () => {
    expect(editEmployeeFormSchema.safeParse(validEdit).success).toBe(true);
  });

  it("rejects invalid names and phone", () => {
    expect(editEmployeeFormSchema.safeParse({ ...validEdit, firstName: "J" }).success).toBe(false);
    expect(editEmployeeFormSchema.safeParse({ ...validEdit, phone: "123" }).success).toBe(false);
  });

  it("rejects invalid skills, salary, and PAN", () => {
    expect(editEmployeeFormSchema.safeParse({ ...validEdit, skills: "React@" }).success).toBe(false);
    expect(editEmployeeFormSchema.safeParse({ ...validEdit, monthlySalary: 0 }).success).toBe(false);
    expect(editEmployeeFormSchema.safeParse({ ...validEdit, taxId: "INVALID" }).success).toBe(false);
  });

  it("validates bank details when partially filled", () => {
    expect(
      editEmployeeFormSchema.safeParse({
        ...validEdit,
        bankAccount: "1234567890",
        ifsc: "",
      }).success,
    ).toBe(false);
    expect(
      editEmployeeFormSchema.safeParse({
        ...validEdit,
        bankAccount: "",
        bankName: "",
        branch: "",
        ifsc: "",
        accountHolder: "",
      }).success,
    ).toBe(true);
  });

  it("blocks a clearly-wrong role/department combination", () => {
    expect(
      editEmployeeFormSchema.safeParse({
        ...validEdit,
        role: "HR",
        departmentName: "Sales",
      }).success,
    ).toBe(false);
  });

  it("allows compatible and generic roles per department", () => {
    expect(
      editEmployeeFormSchema.safeParse({
        ...validEdit,
        role: "SALES",
        departmentName: "Sales",
      }).success,
    ).toBe(true);
    expect(
      editEmployeeFormSchema.safeParse({
        ...validEdit,
        role: "ADMIN",
        departmentName: "Sales",
      }).success,
    ).toBe(true);
  });
});

describe("isRoleAllowedForDepartment", () => {
  it("allows generic and custom roles everywhere", () => {
    expect(isRoleAllowedForDepartment("CEO", "Sales")).toBe(true);
    expect(isRoleAllowedForDepartment("ADMIN", "Engineering")).toBe(true);
    expect(isRoleAllowedForDepartment("BRANCH_MANAGER", "HR")).toBe(true);
    // Unknown / custom role slug → unconstrained.
    expect(isRoleAllowedForDepartment("FINANCE", "Engineering")).toBe(true);
  });

  it("blocks built-in role-specific mismatches but allows fits", () => {
    expect(isRoleAllowedForDepartment("HR", "Sales")).toBe(false);
    expect(isRoleAllowedForDepartment("SALES", "Engineering")).toBe(false);
    expect(isRoleAllowedForDepartment("ENGINEERING", "Engineering")).toBe(true);
    expect(isRoleAllowedForDepartment("HR", "Human Resources")).toBe(true);
    expect(isRoleAllowedForDepartment("CUSTOMER_SUPPORT", "Customer Support")).toBe(true);
  });

  it("is permissive for unknown departments and empty inputs", () => {
    expect(isRoleAllowedForDepartment("HR", "Legal")).toBe(true);
    expect(isRoleAllowedForDepartment("SALES", undefined)).toBe(true);
    expect(isRoleAllowedForDepartment(undefined, "Sales")).toBe(true);
  });
});
