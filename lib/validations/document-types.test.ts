import { describe, expect, it } from "vitest";
import {
  documentTypeFormSchema,
  documentTypeNameToSlug,
  sanitizeDocTypeNameInput,
} from "./document-types";

describe("documentTypeNameToSlug", () => {
  it("normalizes names to hyphenated slugs", () => {
    expect(documentTypeNameToSlug("National ID / Aadhaar Card")).toBe(
      "national-id-aadhaar-card",
    );
  });
});

describe("sanitizeDocTypeNameInput", () => {
  it("strips invalid characters and collapses spaces", () => {
    expect(sanitizeDocTypeNameInput("Aadhaar  @@@ Card")).toBe("Aadhaar Card");
  });
});

describe("documentTypeFormSchema", () => {
  it("accepts decimal sort order", () => {
    const result = documentTypeFormSchema.safeParse({
      name: "National ID",
      isMandatory: true,
      isActive: true,
      sortOrder: "1.5",
      applicableRoles: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sort order", () => {
    const result = documentTypeFormSchema.safeParse({
      name: "National ID",
      isMandatory: true,
      isActive: true,
      sortOrder: "1.555",
      applicableRoles: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects symbol-only names", () => {
    const result = documentTypeFormSchema.safeParse({
      name: "@@@",
      isMandatory: false,
      isActive: true,
      applicableRoles: [],
    });
    expect(result.success).toBe(false);
  });
});
