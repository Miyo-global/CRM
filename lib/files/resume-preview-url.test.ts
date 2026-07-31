import { describe, expect, it } from "vitest";
import { getResumePreviewSrc, isResumePdf } from "./resume-preview-url";

describe("getResumePreviewSrc", () => {
  it("proxies private R2 URLs for iframe embedding", () => {
    const url =
      "https://bucket.r2.cloudflarestorage.com/o/org_abc/careers/resumes/file.pdf";
    expect(getResumePreviewSrc(url)).toBe(
      `/api/storage/download?url=${encodeURIComponent(url)}&inline=1`,
    );
  });

  it("proxies storage keys", () => {
    expect(getResumePreviewSrc("o/org_abc/careers/resumes/file.pdf")).toBe(
      "/api/storage/download?key=o%2Forg_abc%2Fcareers%2Fresumes%2Ffile.pdf&inline=1",
    );
  });
});

describe("isResumePdf", () => {
  it("detects pdf from key when URL lacks extension", () => {
    expect(isResumePdf("o/org/careers/resumes/123-resume.pdf")).toBe(true);
    expect(isResumePdf("o/org/careers/resumes/123-resume.docx")).toBe(false);
  });
});
