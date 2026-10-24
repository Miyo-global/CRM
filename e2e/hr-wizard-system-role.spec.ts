import { expect, test } from "@playwright/test";

/**
 * R3-HR-02: HR may only grant the Employee role, so the Add-employee wizard's
 * System Role dropdown offers exactly "Employee" (the onboard API returns 403
 * for anything else). Nothing is submitted.
 *
 * Needs a running app and an HR-role login in E2E_HR_EMAIL / E2E_HR_PASSWORD.
 * Run with `pnpm test:e2e`.
 */
const EMAIL = process.env.E2E_HR_EMAIL;
const PASSWORD = process.env.E2E_HR_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_HR_EMAIL and E2E_HR_PASSWORD are not set");

test("HR sees only Employee in the wizard's System Role dropdown", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/hr/onboarding?tab=wizard");
  await page.getByLabel(/first name/i).fill("QA-TEST");
  await page.getByLabel(/last name/i).fill("Wizard");
  await page.getByLabel(/^email/i).fill(`qa-test.wizard.${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^next/i }).click();

  await page.getByRole("combobox", { name: /system role/i }).click();
  const options = page.getByRole("option");
  await expect(options).toHaveText(["Employee"]);
});
