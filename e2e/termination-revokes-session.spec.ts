import { expect, test, type Page } from "@playwright/test";

/**
 * R3-SA-01 / R3-SA-15: completing a termination ends the employee's access at
 * once. Two browser contexts: the employee is signed in, the Super Admin
 * completes the termination, the employee's next request lands on /signin, a
 * fresh sign-in is refused with the generic message, and Portal Access reads Off.
 *
 * DESTRUCTIVE: it terminates the employee. Point it at a disposable QA-TEST
 * account whose termination is already at "Email Sent" with an effective date
 * of today or earlier. Needs a running app and:
 *   E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD
 *   E2E_TERMINATE_EMAIL / E2E_TERMINATE_PASSWORD
 *   E2E_TERMINATION_ID
 * Run with `pnpm test:e2e e2e/termination-revokes-session.spec.ts`.
 */
const ADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;
const EMP_EMAIL = process.env.E2E_TERMINATE_EMAIL;
const EMP_PASSWORD = process.env.E2E_TERMINATE_PASSWORD;
const TERMINATION_ID = process.env.E2E_TERMINATION_ID;

test.skip(
  !ADMIN_EMAIL || !ADMIN_PASSWORD || !EMP_EMAIL || !EMP_PASSWORD || !TERMINATION_ID,
  "E2E_SUPERADMIN_*, E2E_TERMINATE_* and E2E_TERMINATION_ID are not set",
);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("a terminated employee's open session is ended and sign-in is refused", async ({ browser }) => {
  const employeeCtx = await browser.newContext();
  const adminCtx = await browser.newContext();
  const employee = await employeeCtx.newPage();
  const admin = await adminCtx.newPage();

  await signIn(employee, EMP_EMAIL as string, EMP_PASSWORD as string);
  await expect(employee).toHaveURL(/dashboard/);
  const employeeId = await employee.evaluate(async () => {
    const s = (await (await fetch("/api/auth/session")).json()) as { user?: { id?: string } } | null;
    return s?.user?.id ?? "";
  });
  expect(employeeId).not.toBe("");

  await signIn(admin, ADMIN_EMAIL as string, ADMIN_PASSWORD as string);
  await expect(admin).toHaveURL(/dashboard/);
  const complete = await admin.request.patch(`/api/hr/termination/${TERMINATION_ID}/complete`);
  expect(complete.status()).toBe(200);
  expect(await complete.json()).toMatchObject({ deactivated: true });

  // Next request from the already-open session: API refused, page -> /signin.
  const api = await employee.request.get("/api/dashboard/upcoming-leaves");
  expect([401, 403]).toContain(api.status());
  await employee.goto("/dashboard");
  await expect(employee).toHaveURL(/\/signin/, { timeout: 20_000 });

  // Fresh sign-in: refused with the same generic message as a wrong password.
  await signIn(employee, EMP_EMAIL as string, EMP_PASSWORD as string);
  await expect(employee).toHaveURL(/\/signin/);
  await expect(employee.getByText(/invalid email or password/i)).toBeVisible();

  // Portal Access is Off on the record.
  const record = await admin.request.get(`/api/hr/employees/${employeeId}`);
  const body = (await record.json()) as { data?: { hasDashboardAccess?: boolean; isActive?: boolean } } & {
    hasDashboardAccess?: boolean;
    isActive?: boolean;
  };
  const emp = body.data ?? body;
  expect(emp.isActive).toBe(false);
  expect(emp.hasDashboardAccess).toBe(false);

  // Gone from the dashboard's upcoming leaves.
  const leaves = await admin.request.get("/api/dashboard/upcoming-leaves");
  const rows = (await leaves.json()) as { data?: { userId: string }[] } | { userId: string }[];
  const list = Array.isArray(rows) ? rows : (rows.data ?? []);
  expect(list.some((r) => r.userId === employeeId)).toBe(false);

  await employeeCtx.close();
  await adminCtx.close();
});
