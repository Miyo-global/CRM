import { expect, test, type Page } from "@playwright/test";

/**
 * QA Fresh R1 regressions outside the onboarding wizard.
 *
 * Needs a running app and logins in E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD and
 * E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD. Run with `pnpm test:e2e`.
 */
const ADMIN = [process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD] as const;
const EMPLOYEE = [process.env.E2E_EMPLOYEE_EMAIL, process.env.E2E_EMPLOYEE_PASSWORD] as const;

test.skip(![...ADMIN, ...EMPLOYEE].every(Boolean), "E2E admin/employee logins are not set");

export async function signIn(page: Page, [email, password]: readonly (string | undefined)[]) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/email/i).fill(email as string);
  await page.getByLabel("Password", { exact: true }).fill(password as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("FR1-019: /roles leads to the role editor, or to access denied", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/roles");
  await expect(page).toHaveURL(/\/settings\/roles/);
  await expect(page.getByRole("heading", { name: /roles & permissions/i })).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, EMPLOYEE);
  const res = await page.goto("/roles");
  expect(res?.status()).not.toBe(404);
  await expect(page.getByText(/access restricted|does not have access/i).first()).toBeVisible();
});
