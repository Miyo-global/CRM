import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getEmailProvider,
  getFromAddress,
  getZeptoMailApiUrl,
  getZeptoMailToken,
  isEmailConfigured,
} from "./config";

const MAIL_VARS = [
  "EMAIL_PROVIDER",
  "ZEPTOMAIL_TOKEN",
  "ZEPTOMAIL_API_KEY",
  "ZEPTOMAIL_API_URL",
  "SENDGRID_API_KEY",
  "EMAIL_FROM_ADDRESS",
  "SENDGRID_FROM_EMAIL",
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

  it("defaults to zeptomail", () => {
    expect(getEmailProvider()).toBe("zeptomail");
  });

  it("honours an explicit EMAIL_PROVIDER", () => {
    process.env.EMAIL_PROVIDER = "sendgrid";
    expect(getEmailProvider()).toBe("sendgrid");
  });

  it("falls back to whichever credential is present when EMAIL_PROVIDER is unset", () => {
    process.env.SENDGRID_API_KEY = "SG.abc";
    expect(getEmailProvider()).toBe("sendgrid");

    process.env.ZEPTOMAIL_TOKEN = "wSsVR.token";
    expect(getEmailProvider()).toBe("zeptomail");
  });

  it("treats a whitespace-only token as unset", () => {
    process.env.ZEPTOMAIL_TOKEN = "   ";
    expect(getZeptoMailToken()).toBeUndefined();
    expect(isEmailConfigured()).toBe(false);
  });

  it("reports configured only when the selected provider has its credential", () => {
    process.env.EMAIL_PROVIDER = "zeptomail";
    process.env.SENDGRID_API_KEY = "SG.abc";
    expect(isEmailConfigured()).toBe(false);

    process.env.ZEPTOMAIL_TOKEN = "wSsVR.token";
    expect(isEmailConfigured()).toBe(true);
  });

  it("strips a pasted Zoho-enczapikey prefix from the token", () => {
    process.env.ZEPTOMAIL_TOKEN = "Zoho-enczapikey  wSsVR.token ";
    expect(getZeptoMailToken()).toBe("wSsVR.token");
  });

  it("defaults to the US data centre and allows a regional override", () => {
    expect(getZeptoMailApiUrl()).toBe("https://api.zeptomail.com/v1.1/email");
    process.env.ZEPTOMAIL_API_URL = "https://api.zeptomail.eu/v1.1/email";
    expect(getZeptoMailApiUrl()).toBe("https://api.zeptomail.eu/v1.1/email");
  });

  it("prefers EMAIL_FROM_ADDRESS over provider-specific from addresses", () => {
    process.env.SENDGRID_FROM_EMAIL = "old@example.com";
    expect(getFromAddress()).toBe("old@example.com");
    process.env.EMAIL_FROM_ADDRESS = "noreply@example.com";
    expect(getFromAddress()).toBe("noreply@example.com");
  });
});
