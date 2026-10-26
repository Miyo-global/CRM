import { expect, test, type Page } from "@playwright/test";

/**
 * QA Fresh R1 regressions in the Add Employee wizard.
 *
 * Needs a running app and an HR-role login in E2E_HR_EMAIL / E2E_HR_PASSWORD.
 * Nothing is submitted. Run with `pnpm test:e2e`.
 */
const EMAIL = process.env.E2E_HR_EMAIL;
const PASSWORD = process.env.E2E_HR_PASSWORD;
/** A job title in the catalog of the first department listed. */
const JOB_TITLE = process.env.E2E_JOB_TITLE ?? "QA-TEST Engineer";

test.skip(!EMAIL || !PASSWORD, "E2E_HR_EMAIL and E2E_HR_PASSWORD are not set");

async function openWizard(page: Page) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/hr/onboarding?tab=wizard");
  await page.waitForLoadState("networkidle");
}

test("FR1-008: the first Next click on step 1 advances", async ({ page }) => {
  await openWizard(page);
  await page.getByLabel(/first name/i).fill("QA-TEST");
  await page.getByLabel(/last name/i).fill("Wizard");
  // Focus stays in the email box, so the click also blurs it and starts the check.
  await page.getByLabel(/^email/i).fill(`qa-test.fr1.${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^next/i }).click();
  await expect(page.getByRole("combobox", { name: /department/i })).toBeVisible({ timeout: 5000 });
});

test("FR1-011: name inputs stop at 50 characters", async ({ page }) => {
  await openWizard(page);
  const first = page.getByLabel(/first name/i);
  await first.fill("a".repeat(300));
  await expect(first).toHaveValue("a".repeat(50));
  const last = page.getByLabel(/last name/i);
  await last.fill("b".repeat(300));
  await expect(last).toHaveValue("b".repeat(50));
});

test("FR1-012: letters typed into Phone get an inline explanation", async ({ page }) => {
  await openWizard(page);
  const phone = page.getByPlaceholder("Enter phone number");
  await phone.pressSequentially("abcdef");
  await expect(page.getByText("Phone numbers can only contain digits.")).toBeVisible();
  await phone.pressSequentially("98765");
  await expect(page.getByText("Phone numbers can only contain digits.")).toBeHidden();
});

test("FR1-010: the joining date picker stops one year ahead", async ({ page }) => {
  await openWizard(page);
  await page.getByLabel(/first name/i).fill("QA-TEST");
  await page.getByLabel(/last name/i).fill("Wizard");
  await page.getByLabel(/^email/i).fill(`qa-test.fr1.${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^next/i }).click();
  await expect(page.getByText(/\(one year ahead\)/)).toBeVisible();
  await page.getByRole("button", { name: /joining date/i }).click();
  // Thirteen months forward is past the limit, so "next month" stops working.
  const next = page.getByRole("button", { name: /next month/i });
  for (let i = 0; i < 13 && (await next.isEnabled()); i++) await next.click();
  await expect(next).toBeDisabled();
});

test("FR1-014: Job Title and Monthly Salary have real accessible names", async ({ page }) => {
  await openWizard(page);
  await page.getByLabel(/first name/i).fill("QA-TEST");
  await page.getByLabel(/last name/i).fill("Wizard");
  await page.getByLabel(/^email/i).fill(`qa-test.fr1.${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^next/i }).click();
  await expect(page.getByRole("combobox", { name: /job title/i })).toBeVisible();

  await page.getByRole("combobox", { name: /department/i }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("combobox", { name: /job title/i }).click();
  await page.getByRole("button", { name: JOB_TITLE }).click();
  await page.getByRole("button", { name: /^next/i }).click();
  const salary = page.getByRole("textbox", { name: /monthly salary/i });
  await expect(salary).toBeVisible();
  await salary.fill("25000");
  await expect(page.getByRole("textbox", { name: /monthly salary/i })).toBeVisible();
});
