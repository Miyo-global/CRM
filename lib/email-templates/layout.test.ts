import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getEmailTemplate } from "./base";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;

function mailSourceFiles(): string[] {
  return execSync("find lib/email lib/email-templates lib/notifications lib/email.ts -name '*.ts'", {
    encoding: "utf-8",
  })
    .split("\n")
    .filter((f) => f && !f.endsWith(".test.ts"));
}

describe("email layout", () => {
  const html = getEmailTemplate({ title: "Test", content: "<p>Body</p>" });

  it("is flat: no gradient, webfont import, or rounded shadow card", () => {
    expect(html).not.toMatch(/linear-gradient/);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/box-shadow/);
  });

  it("is table-based so it survives desktop clients", () => {
    expect(html).toMatch(/<table role="presentation"/);
  });

  it("tells the reader why they got it and how to reply", () => {
    expect(html).toMatch(/You received this email because/);
    expect(html).toMatch(/support@miyoglobal\.com/);
  });

  it("keeps emoji and the ' - Miyo Global' suffix out of every template", () => {
    const offenders = mailSourceFiles().filter((f) => {
      const src = readFileSync(f, "utf-8");
      return EMOJI.test(src) || src.includes(" - Miyo Global") || src.includes(" — Miyo Global");
    });
    expect(offenders).toEqual([]);
  });
});

describe("one layout everywhere", () => {
  it("notification mail uses the shared base template", async () => {
    const { buildNotificationEmail } = await import("@/lib/notifications/email");
    const { html, subject } = buildNotificationEmail({
      title: "Marked absent",
      message: "You did not check in today.",
      link: "/hr/attendance",
    });
    expect(subject).toBe("Marked absent");
    expect(html).toMatch(/<table role="presentation"/);
    expect(html).toMatch(/You received this email because/);
    expect(html).toMatch(/\/hr\/attendance/);
  });

  it("carries the logo once", () => {
    const html = getEmailTemplate({ title: "T", content: "<p>x</p>" });
    expect(html.match(/logo\.png/g)?.length).toBe(1);
  });
});
