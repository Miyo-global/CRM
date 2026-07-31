import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getFileKeyFromUrl, isPrivateStorageUrl } from "./storage-url";

describe("getFileKeyFromUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns raw keys unchanged", () => {
    expect(getFileKeyFromUrl("o/org-1/documents/file.pdf")).toBe(
      "o/org-1/documents/file.pdf",
    );
  });

  it("strips public base URL prefix", () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://cdn.example.com";
    expect(getFileKeyFromUrl("https://cdn.example.com/o/org-1/file.pdf")).toBe(
      "o/org-1/file.pdf",
    );
  });

  it("parses R2 endpoint URLs", () => {
    process.env.R2_BUCKET_NAME = "miyo-global-crm";
    expect(
      getFileKeyFromUrl(
        "https://97126a263bd634508fa7e682beab3d8c.r2.cloudflarestorage.com/miyo-global-crm/o/org-1/documents/file-pip.pdf",
      ),
    ).toBe("o/org-1/documents/file-pip.pdf");
  });
});

describe("isPrivateStorageUrl", () => {
  it("detects raw keys and R2 URLs", () => {
    expect(isPrivateStorageUrl("o/org/documents/a.pdf")).toBe(true);
    expect(
      isPrivateStorageUrl(
        "https://account.r2.cloudflarestorage.com/bucket/o/org/documents/a.pdf",
      ),
    ).toBe(true);
    expect(isPrivateStorageUrl("https://drive.google.com/file/d/abc")).toBe(false);
  });
});
