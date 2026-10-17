import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { EMAIL_CATALOG, type EmailTemplateId } from "./catalog.generated";
import { renderEmail, templatePlaceholders } from "./render";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;
const ids = Object.keys(EMAIL_CATALOG) as EmailTemplateId[];

describe("email template catalog (MIYO-0097..0100)", () => {
  it("is in sync with email-templates/", () => {
    const before = readFileSync("lib/email-templates/catalog.generated.ts", "utf-8");
    execSync("node scripts/build-email-templates.mjs", { stdio: "ignore" });
    expect(readFileSync("lib/email-templates/catalog.generated.ts", "utf-8")).toBe(before);
  });

  it.each(ids)("%s renders every placeholder with a text part", (id) => {
    const vars = Object.fromEntries(templatePlaceholders(id).map((k) => [k, `v_${k}`]));
    const out = renderEmail(id, vars);
    for (const part of [out.subject, out.preheader, out.html, out.text]) expect(part).not.toMatch(/\{\{/);
    expect(out.text.length).toBeGreaterThan(20);
    expect(out.html).not.toMatch(/linear-gradient|<style|@import/);
    expect(out.html).toMatch(/logo/);
    expect(EMOJI.test(out.subject)).toBe(false);
    expect(out.subject).not.toMatch(/[-—] Miyo Global$/);
  });

  it("escapes values in HTML only, never in the subject", () => {
    const out = renderEmail("payroll-payslip", { month_label: "October 2026", org_name: "A & B" });
    expect(out.subject).toBe("Your payslip for October 2026");
    expect(out.html).toContain("A &amp; B");
    expect(out.text).toContain("A & B");
    const s = renderEmail("auth-invitation", { inviter_name: "O'Neil", org_name: "A & B" });
    expect(s.subject).toBe("O'Neil invited you to A & B");
  });
});
