import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These constants are evaluated at module load, so each case re-imports the
 * module with the environment already stubbed.
 */
async function loadWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("./company");
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe("company constants with a blank environment", () => {
  // Hosting platforms commonly define an env var with an empty value. `??`
  // only replaces null/undefined, so "" would slip through — and a blank
  // CRM_BASE_URL reaching new URL() in the root layout fails the build.
  it("falls back to the default when NEXT_PUBLIC_APP_URL is set but empty", async () => {
    const { CRM_BASE_URL } = await loadWith({ NEXT_PUBLIC_APP_URL: "" });
    expect(CRM_BASE_URL).not.toBe("");
    expect(() => new URL(CRM_BASE_URL)).not.toThrow();
  });

  it("keeps every URL constant parseable when the env is blank", async () => {
    const mod = await loadWith({
      NEXT_PUBLIC_APP_URL: "",
      NEXT_PUBLIC_COMPANY_WEBSITE_URL: "",
    });
    for (const url of [mod.CRM_BASE_URL, mod.COMPANY_WEBSITE_URL]) {
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("falls back to real addresses when the mail env is blank", async () => {
    const mod = await loadWith({
      EMAIL_FROM_ADDRESS: "",
      HR_NOTIFICATION_EMAIL: "",
      SUPPORT_EMAIL: "",
      INFO_EMAIL: "",
    });
    for (const addr of [mod.NOREPLY_EMAIL, mod.HR_EMAIL, mod.SUPPORT_EMAIL, mod.INFO_EMAIL]) {
      expect(addr).toContain("@");
    }
  });

  it("still honours a real value when one is provided", async () => {
    const { CRM_BASE_URL } = await loadWith({ NEXT_PUBLIC_APP_URL: "https://crm.example.org" });
    expect(CRM_BASE_URL).toBe("https://crm.example.org");
  });

  it("falls back for the legal name and established date", async () => {
    const mod = await loadWith({
      NEXT_PUBLIC_COMPANY_LEGAL_NAME: "",
      NEXT_PUBLIC_COMPANY_ESTABLISHED_DATE: "",
    });
    expect(mod.COMPANY_LEGAL_NAME).not.toBe("");
    expect(mod.COMPANY_ESTABLISHED_DATE_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
