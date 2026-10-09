import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getEmailProvider,
  getFromAddress,
  getZeptoMailApiUrl,
  getZeptoMailToken,
  isEmailConfigured,
} from "./config";

const MAIL_VARS = [
  "ZEPTOMAIL_API_TOKEN",
  "ZEPTOMAIL_TOKEN",
  "ZEPTOMAIL_API_KEY",
  "ZEPTOMAIL_API_URL",
  "EMAIL_FROM_ADDRESS",
  "ZEPTOMAIL_FROM_EMAIL",
] as const;

describe("email config", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of MAIL_VARS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of MAIL_VARS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it("is always zeptomail", () => {
    expect(getEmailProvider()).toBe("zeptomail");
  });

  it("prefers ZEPTOMAIL_API_TOKEN (Miyo naming)", () => {
    process.env.ZEPTOMAIL_TOKEN = "legacy.token";
    process.env.ZEPTOMAIL_API_TOKEN = "miyo.token";
    expect(getZeptoMailToken()).toBe("miyo.token");
  });

  it("falls back to ZEPTOMAIL_TOKEN / ZEPTOMAIL_API_KEY", () => {
    process.env.ZEPTOMAIL_TOKEN = "wSsVR.token";
    expect(getZeptoMailToken()).toBe("wSsVR.token");
  });

  it("treats a whitespace-only token as unset", () => {
    process.env.ZEPTOMAIL_API_TOKEN = "   ";
    expect(getZeptoMailToken()).toBeUndefined();
    expect(isEmailConfigured()).toBe(false);
  });

  it("reports configured when a ZeptoMail token is present", () => {
    expect(isEmailConfigured()).toBe(false);
    process.env.ZEPTOMAIL_API_TOKEN = "wSsVR.token";
    expect(isEmailConfigured()).toBe(true);
  });

  it("strips a pasted Zoho-enczapikey prefix from the token", () => {
    process.env.ZEPTOMAIL_API_TOKEN = "Zoho-enczapikey  wSsVR.token ";
    expect(getZeptoMailToken()).toBe("wSsVR.token");
  });

  it("defaults to the US data centre and allows a regional override", () => {
    expect(getZeptoMailApiUrl()).toBe("https://api.zeptomail.com/v1.1/email");
    process.env.ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";
    expect(getZeptoMailApiUrl()).toBe("https://api.zeptomail.in/v1.1/email");
  });

  it("prefers EMAIL_FROM_ADDRESS over ZEPTOMAIL_FROM_EMAIL", () => {
    process.env.ZEPTOMAIL_FROM_EMAIL = "old@example.com";
    expect(getFromAddress()).toBe("old@example.com");
    process.env.EMAIL_FROM_ADDRESS = "noreply@example.com";
    expect(getFromAddress()).toBe("noreply@example.com");
  });
});
