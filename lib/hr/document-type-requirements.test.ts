import { describe, expect, it } from "vitest";
import {
  documentTypesForRole,
  progressForRequiredDocs,
  requiredDocumentTypesForRole,
} from "@/lib/hr/document-type-requirements";

const types = [
  {
    id: 1,
    name: "Government ID",
    isMandatory: true,
    isActive: true,
    applicableRoles: [] as string[],
    sortOrder: 1,
  },
  {
    id: 2,
    name: "Resume",
    isMandatory: true,
    isActive: true,
    applicableRoles: ["ENGINEERING", "HR"],
    sortOrder: 2,
  },
  {
    id: 3,
    name: "Bank Proof",
    isMandatory: true,
    isActive: true,
    applicableRoles: ["SALES"],
    sortOrder: 3,
  },
  {
    id: 4,
    name: "Optional Form",
    isMandatory: false,
    isActive: true,
    applicableRoles: [],
    sortOrder: 4,
  },
];

describe("documentTypesForRole", () => {
  it("returns global types plus role-specific types", () => {
    const engineering = documentTypesForRole(types, "ENGINEERING");
    expect(engineering.map((t) => t.name)).toEqual([
      "Government ID",
      "Resume",
      "Optional Form",
    ]);
  });

  it("excludes inactive types", () => {
    const withInactive = [
      ...types,
      {
        id: 5,
        name: "Old Doc",
        isMandatory: true,
        isActive: false,
        applicableRoles: [],
        sortOrder: 5,
      },
    ];
    expect(documentTypesForRole(withInactive, "SALES")).toHaveLength(3);
  });
});

describe("requiredDocumentTypesForRole", () => {
  it("counts only mandatory types for the role", () => {
    expect(requiredDocumentTypesForRole(types, "SALES").map((t) => t.name)).toEqual([
      "Government ID",
      "Bank Proof",
    ]);
    expect(requiredDocumentTypesForRole(types, "ENGINEERING")).toHaveLength(2);
  });
});

describe("progressForRequiredDocs", () => {
  it("derives approved and in-progress states from required types", () => {
    const required = requiredDocumentTypesForRole(types, "SALES");
    const statusMap = new Map<number, string>([
      [1, "APPROVED"],
      [3, "SUBMITTED"],
    ]);
    const progress = progressForRequiredDocs(required, statusMap);
    expect(progress.totalRequired).toBe(2);
    expect(progress.totalApproved).toBe(1);
    expect(progress.totalPendingReview).toBe(1);
    expect(progress.derivedStatus).toBe("IN_PROGRESS");
  });

  it("returns NOT_REQUIRED when nothing is mandatory for role", () => {
    const optionalOnly = [
      {
        id: 10,
        name: "Optional",
        isMandatory: false,
        isActive: true,
        applicableRoles: ["CEO"],
        sortOrder: 1,
      },
    ];
    const progress = progressForRequiredDocs(
      requiredDocumentTypesForRole(optionalOnly, "CEO"),
      new Map(),
    );
    expect(progress.derivedStatus).toBe("NOT_REQUIRED");
  });
});
