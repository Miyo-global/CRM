import { expect, test, type Browser } from "@playwright/test";

/**
 * R3-EMP-01 / R3-PRJ-01 / R3-PRJ-04 / R3-TZ-01: clock-in and time logging
 * from browsers whose local day differs from the org's (IST).
 *
 * Needs a running app and an employee login: E2E_EMPLOYEE_EMAIL /
 * E2E_EMPLOYEE_PASSWORD. The time-log part also needs a ticket that employee
 * can log on: E2E_PROJECT_ID and E2E_TICKET_ID. Clocks the employee in for
 * today (no clock-out: that needs a saved work log) and may create one
 * timesheet row for today. Run with `pnpm test:e2e`, ideally between 13:30
 * and 18:30 UTC, when New York and IST are on different days.
 */
const EMP = { email: process.env.E2E_EMPLOYEE_EMAIL, password: process.env.E2E_EMPLOYEE_PASSWORD };
const PROJECT_ID = process.env.E2E_PROJECT_ID;
const TICKET_ID = process.env.E2E_TICKET_ID;
const ORG_TZ = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata";

test.skip(!EMP.email || !EMP.password, "E2E employee login is not set");

const orgToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TZ }).format(new Date());
const plusDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function signIn(browser: Browser, timezoneId: string) {
  const context = await browser.newContext({ timezoneId });
  const page = await context.newPage();
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(EMP.email as string);
  await page.getByLabel(/password/i).fill(EMP.password as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  return { context, page };
}

for (const timezoneId of ["America/New_York", "Asia/Calcutta"]) {
  test.describe(`browser in ${timezoneId}`, () => {
    test("check-in shows as clocked in after reload; second check-in is refused", async ({ browser }) => {
      const { context, page } = await signIn(browser, timezoneId);

      await page.goto("/hr/attendance");
      const checkIn = page.getByRole("button", { name: /^check in$/i });
      const checkOut = page.getByRole("button", { name: /^check out$/i });
      await expect(checkOut.or(checkIn).first()).toBeVisible();

      if (await checkIn.isEnabled()) {
        const punched = page.waitForResponse((r) => r.url().includes("/api/hr/attendance/check-in"));
        await checkIn.click();
        expect((await punched).status()).toBe(200);
      }

      // The widget reads the server's open record for the org-tz today.
      await page.reload();
      await expect(page.getByRole("button", { name: /^check out$/i })).toBeEnabled();
      await expect(page.getByRole("button", { name: /^check in$/i })).toBeDisabled();
      await expect(page.getByText("Not clocked in")).toHaveCount(0);

      const status = (await (await page.request.get("/api/hr/attendance/status")).json()) as {
        todayLog: { date: string; checkIn: string | null; checkOut: string | null } | null;
      };
      expect(status.todayLog?.date).toBe(orgToday());
      expect(status.todayLog?.checkIn).toBeTruthy();
      expect(status.todayLog?.checkOut).toBeNull();

      const again = await page.request.post("/api/hr/attendance/check-in", { data: {} });
      expect(again.status()).toBe(400);

      // The dashboard widget agrees.
      await page.goto("/dashboard");
      await expect(page.getByRole("button", { name: /web clock-out/i })).toBeVisible();

      await context.close();
    });

    test("time log on a ticket accepts org-tz today, rejects tomorrow, 409s a duplicate", async ({ browser }) => {
      test.skip(!PROJECT_ID || !TICKET_ID, "E2E_PROJECT_ID / E2E_TICKET_ID are not set");
      const { context, page } = await signIn(browser, timezoneId);
      const url = `/api/projects/${PROJECT_ID}/tickets/${TICKET_ID}/time-entries`;
      const today = orgToday();

      const first = await page.request.post(url, { data: { date: today, hours: 0.5, description: "QA-TEST tz" } });
      // 409 when this employee already has today's log (e.g. the other timezone ran first).
      expect([201, 409]).toContain(first.status());

      const dup = await page.request.post(url, { data: { date: today, hours: 0.5, description: "QA-TEST tz" } });
      expect(dup.status()).toBe(409);
      expect(((await dup.json()) as { error: string }).error).toMatch(/already logged time/i);

      const future = await page.request.post(url, { data: { date: plusDays(today, 1), hours: 0.5 } });
      expect(future.status()).toBe(400);
      expect(((await future.json()) as { error: string }).error).toMatch(/future/i);

      // The stored date is the calendar day sent, not shifted.
      const mine = (await (await page.request.get(url)).json()) as { date: string }[];
      expect(mine.some((e) => String(e.date).slice(0, 10) === today)).toBe(true);

      await context.close();
    });
  });
}
