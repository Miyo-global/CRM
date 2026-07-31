import { describe, expect, it } from "vitest";
import {
  richDocumentTitleSchema,
  documentFolderNameSchema,
  orgDocumentVariableSlugSchema,
} from "./hr-documents";

describe("richDocumentTitleSchema", () => {
  it("accepts a valid title", () => {
    expect(richDocumentTitleSchema.safeParse("Employee Handbook 2026").success).toBe(true);
  });

  it("rejects special-character-only titles", () => {
    expect(richDocumentTitleSchema.safeParse("@@@").success).toBe(false);
  });

  it("rejects consecutive spaces", () => {
    expect(richDocumentTitleSchema.safeParse("Offer  Letter").success).toBe(false);
  });
});

describe("documentFolderNameSchema", () => {
  it("accepts a valid folder name", () => {
    expect(documentFolderNameSchema.safeParse("Onboarding 2026").success).toBe(true);
  });

  it("rejects consecutive spaces", () => {
    expect(documentFolderNameSchema.safeParse("HR  Docs").success).toBe(false);
  });
});

describe("orgDocumentVariableSlugSchema", () => {
  it("rejects consecutive underscores", () => {
    expect(orgDocumentVariableSlugSchema.safeParse("Support__Email").success).toBe(false);
  });

  it("requires starting with a letter", () => {
    expect(orgDocumentVariableSlugSchema.safeParse("1Support").success).toBe(false);
  });
});
