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

/** fetch() from the signed-in page, so the session cookie goes with it. */
export async function api(page: Page, url: string, init?: { method?: string; body?: unknown }) {
  return page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, {
        method: init?.method ?? "GET",
        headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        // not JSON
      }
      return { status: res.status, text, json };
    },
    { url, init },
  );
}

/** Onboard a QA-TEST employee through the API; returns the new user id. */
export async function onboardQaEmployee(page: Page, overrides: Record<string, unknown> = {}): Promise<string> {
  const depts = (await api(page, "/api/hr/departments")).json as Array<{ id: number }> | { data: Array<{ id: number }> };
  const list = Array.isArray(depts) ? depts : depts.data;
  const res = await api(page, "/api/hr/employees/onboard", {
    method: "POST",
    body: {
      firstName: "QA-TEST",
      lastName: "Fresh",
      email: `qa-test.fr1.${Date.now()}@example.com`,
      designation: "QA-TEST Engineer",
      departmentId: list[0].id,
      role: "EMPLOYEE",
      monthlySalary: 30000,
      joiningDate: new Date().toISOString().slice(0, 10),
      ...overrides,
    },
  });
  expect(res.status, res.text).toBe(200);
  return (res.json as { userId: string }).userId;
}

test("FR1-017: a terminated profile hides the account set-up status", async ({ page }) => {
  await signIn(page, ADMIN);
  const userId = await onboardQaEmployee(page);
  await page.goto(`/hr/employees/${userId}`);
  await expect(page.getByText("Account set-up")).toBeVisible();

  const off = await api(page, `/api/hr/employees/${userId}/active`, { method: "PATCH", body: { isActive: false } });
  expect(off.status, off.text).toBe(200);
  await page.reload();
  await expect(page.getByText("Terminated").first()).toBeVisible();
  await expect(page.getByText("Account set-up")).toHaveCount(0);
  await expect(page.getByText("Set-up link expired")).toHaveCount(0);
});

test("FR1-016: an empty termination draft shows inline errors per field", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/hr/termination");
  await page.getByRole("button", { name: "New Termination" }).first().click();
  await page.getByRole("button", { name: "Save as Draft" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Select an employee.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Select at least one termination reason.")).toBeVisible();
  await expect(dialog.getByText(/at least 50 characters/)).toBeVisible();
  await expect(dialog.getByText("Set an effective date.")).toBeVisible();
  await expect(dialog.getByLabel("Detailed explanation")).toHaveAttribute("aria-invalid", "true");
});

test("FR1-029/030: dashboard clock widget timer and blocked clock-out", async ({ page }) => {
  // Needs an employee who has not clocked in today and has no work log yet.
  test.skip(!process.env.E2E_CLOCK_EMAIL, "E2E_CLOCK_EMAIL is not set");
  await signIn(page, [process.env.E2E_CLOCK_EMAIL, process.env.E2E_CLOCK_PASSWORD ?? EMPLOYEE[1]]);
  await page.getByRole("button", { name: "WEB CLOCK-IN" }).click();
  const timer = page.getByText(/^\d{2}:\d{2}:\d{2}$/).first();
  await expect(timer).toBeVisible();
  expect(await timer.innerText()).not.toContain("-");
  await page.getByRole("button", { name: "WEB CLOCK-OUT" }).click();
  await page.getByRole("button", { name: "Open work log" }).click();
  await expect(page).toHaveURL(/\/hr\/work-logs/);
});

test("FR1-031: approving a reimbursement asks first and confirms with a toast", async ({ page }) => {
  await signIn(page, EMPLOYEE);
  const created = await api(page, "/api/hr/reimbursements", {
    method: "POST",
    body: { category: "Travel", amount: 500, description: "QA-TEST FR1 reimbursement" },
  });
  expect(created.status, created.text).toBeLessThan(300);

  await page.context().clearCookies();
  await signIn(page, ADMIN);
  await page.goto("/hr/reimbursements");
  const row = page.getByRole("row", { name: /QA-TEST FR1 reimbursement/ }).first();
  await row.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
  await expect(dialog.getByText("Approve this reimbursement?")).toBeVisible();
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Reimbursement approved")).toBeVisible();
});

test("FR1-006: the employee is notified when a reimbursement is approved", async ({ browser }) => {
  const emp = await browser.newPage();
  await signIn(emp, EMPLOYEE);
  const description = `QA-TEST FR1 notify ${Date.now()}`;
  const created = await api(emp, "/api/hr/reimbursements", {
    method: "POST",
    body: { category: "Travel", amount: 750, description },
  });
  expect(created.status, created.text).toBeLessThan(300);
  const list = (await api(emp, "/api/hr/reimbursements")).json as Array<{ id: number; description: string }> | { data: Array<{ id: number; description: string }> };
  const rows = Array.isArray(list) ? list : list.data;
  const id = rows.find((r) => r.description === description)?.id;
  expect(id).toBeTruthy();

  const admin = await browser.newPage();
  await signIn(admin, ADMIN);
  const decided = await api(admin, `/api/hr/reimbursements/${id}`, { method: "PATCH", body: { status: "APPROVED" } });
  expect(decided.status, decided.text).toBe(200);

  await expect
    .poll(async () => (await api(emp, "/api/notifications?unreadOnly=false&limit=20")).text, { timeout: 10_000 })
    .toContain("Your reimbursement of ₹750 (Travel) was approved.");
});
