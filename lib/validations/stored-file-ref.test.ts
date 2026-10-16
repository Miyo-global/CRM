import { describe, expect, it } from "vitest";
import { isStoredFileRef, storedFileRefSchema } from "./stored-file-ref";

describe("storedFileRefSchema", () => {
  it("accepts the storage key /api/storage/upload returns", () => {
    expect(isStoredFileRef("o/org_abc123/documents/1760000000000-uuid-report.pdf")).toBe(true);
    expect(isStoredFileRef("documents/1760000000000-uuid-report.pdf")).toBe(true);
  });

  it("still accepts URLs and rooted paths", () => {
    expect(isStoredFileRef("https://files.example.com/a.pdf")).toBe(true);
    expect(isStoredFileRef("/api/storage/download?key=a")).toBe(true);
  });

  it("rejects junk", () => {
    expect(storedFileRefSchema.safeParse("not a path").success).toBe(false);
    expect(storedFileRefSchema.safeParse("").success).toBe(false);
  });
});
