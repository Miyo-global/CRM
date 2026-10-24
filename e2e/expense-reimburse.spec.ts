import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * R3-HR-01: an employee files a claim, HR approves it and marks it reimbursed
 * (that PATCH used to 500), and the employee sees it paid in Reimbursements.
 *
 * Needs a running app and two logins: E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD
 * and E2E_HR_EMAIL / E2E_HR_PASSWORD (HR is not the employee's own approver
 * conflict). Creates one QA-TEST expense. Run with `pnpm test:e2e`.
 */
const EMP = { email: process.env.E2E_EMPLOYEE_EMAIL, password: process.env.E2E_EMPLOYEE_PASSWORD };
const HR = { email: process.env.E2E_HR_EMAIL, password: process.env.E2E_HR_PASSWORD };

test.skip(!EMP.email || !EMP.password || !HR.email || !HR.password, "E2E employee/HR logins are not set");

async function signIn(browser: Browser, who: { email?: string; password?: string }): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(who.email as string);
  await page.getByLabel(/password/i).fill(who.password as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  return page;
}

test("employee files, HR approves and reimburses, employee sees it paid", async ({ browser }) => {
  const employee = await signIn(browser, EMP);
  const hr = await signIn(browser, HR);
  const tag = `QA-TEST reimburse ${Date.now()}`;

  const filed = await employee.request.post("/api/hr/expenses", {
    data: { category: "Travel", amount: 123, paymentMethod: "Cash", merchant: tag, description: tag, expenseDate: new Date().toISOString().slice(0, 10) },
  });
  expect(filed.ok()).toBeTruthy();
  const expenseId = ((await filed.json()) as { id: number }).id;

  const approved = await hr.request.patch(`/api/hr/expenses/${expenseId}`, { data: { status: "APPROVED" } });
  expect(approved.status()).toBe(200);

  // The same request the "Mark reimbursed" button sends.
  const paid = await hr.request.patch(`/api/hr/expenses/${expenseId}`, { data: { status: "PAID" } });
  expect(paid.status()).toBe(200);

  // Doing it twice is a 409 with a message, never a 500.
  const again = await hr.request.patch(`/api/hr/expenses/${expenseId}`, { data: { status: "PAID" } });
  expect(again.status()).toBe(409);
  expect(((await again.json()) as { error: string }).error).toMatch(/already been reimbursed/);

  // A bad status is a 400 with field errors.
  const bad = await hr.request.patch(`/api/hr/expenses/${expenseId}`, { data: { status: "DONE" } });
  expect(bad.status()).toBe(400);

  const mine = (await (await employee.request.get("/api/hr/reimbursements")).json()) as {
    expenseId: number | null;
    status: string;
  }[];
  expect(mine.find((r) => r.expenseId === expenseId)?.status).toBe("PAID");

  await employee.goto("/hr/reimbursements");
  await expect(employee.getByText(tag).first()).toBeVisible();
});
