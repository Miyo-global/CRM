import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_DIR,
  LOGO_PNG_PATH,
  LOGO_SVG_PATH,
  PAYSLIP_OUTPUT_DIR,
  resolvePublicPath,
} from "./paths";

describe("asset paths", () => {
  it("points the logo constants inside the public directory", () => {
    expect(LOGO_PNG_PATH).toBe(path.join(PUBLIC_DIR, "logo.png"));
    expect(LOGO_SVG_PATH).toBe(path.join(PUBLIC_DIR, "logo.svg"));
  });

  it("nests payslip output under the generated directory", () => {
    expect(PAYSLIP_OUTPUT_DIR.endsWith(path.join("generated", "payslips"))).toBe(true);
  });
});

describe("resolvePublicPath", () => {
  it("resolves a normal public-relative URL", () => {
    expect(resolvePublicPath("/uploads/report.pdf")).toBe(
      path.join(PUBLIC_DIR, "uploads", "report.pdf"),
    );
  });

  it("tolerates missing and repeated leading slashes", () => {
    const expected = path.join(PUBLIC_DIR, "logo.png");
    expect(resolvePublicPath("logo.png")).toBe(expected);
    expect(resolvePublicPath("///logo.png")).toBe(expected);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(resolvePublicPath("")).toBeNull();
    expect(resolvePublicPath("/")).toBeNull();
    expect(resolvePublicPath("   ")).toBeNull();
  });

  it("rejects traversal that escapes the public directory", () => {
    // These reach the resolver from database-stored file URLs, so escaping
    // /public would mean arbitrary file read (document export) or arbitrary
    // unlink (QR cleanup).
    expect(resolvePublicPath("/../.env")).toBeNull();
    expect(resolvePublicPath("/../../etc/passwd")).toBeNull();
    expect(resolvePublicPath("/uploads/../../.env")).toBeNull();
    expect(resolvePublicPath("/..")).toBeNull();
  });

  it("allows traversal that stays within the public directory", () => {
    expect(resolvePublicPath("/uploads/../logo.png")).toBe(path.join(PUBLIC_DIR, "logo.png"));
  });

  it("does not treat a sibling directory with a shared prefix as inside", () => {
    // `<root>/public-backup` must not pass a naive startsWith(PUBLIC_DIR) check.
    expect(resolvePublicPath("/../public-backup/secret.txt")).toBeNull();
  });
});
