import { expect, test, type Page } from "@playwright/test";

/**
 * Per-employee professional tax, end to end: the wizard on a 375×812 phone,
 * the profile editor, payroll using each employee's own PT, the payslip
 * snapshot, the employee's own payslip (screen and PDF) and the role guards.
 *
 * Needs a running app with:
 *   E2E_HR_EMAIL / E2E_HR_PASSWORD             HR login
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD       Admin login (approves and pays)
 *   E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD Employee login, with a salary
 *     structure and attendance for E2E_PT_MONTH and no payroll for it yet
 *   E2E_OTHER_EMPLOYEE_EMAIL                   a second employee with a salary structure
 *   E2E_PT_MONTH                               YYYY-MM to run payroll for
 *
 * Creates QA-TEST-prefixed data. Run with `pnpm test:e2e`.
 */
const env = {
  hr: [process.env.E2E_HR_EMAIL, process.env.E2E_HR_PASSWORD],
  admin: [process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD],
  employee: [process.env.E2E_EMPLOYEE_EMAIL, process.env.E2E_EMPLOYEE_PASSWORD],
  other: process.env.E2E_OTHER_EMPLOYEE_EMAIL,
  month: process.env.E2E_PT_MONTH,
};
const configured =
  [...env.hr, ...env.admin, ...env.employee, env.other, env.month].every(Boolean);

test.skip(!configured, "E2E PT logins, E2E_OTHER_EMPLOYEE_EMAIL and E2E_PT_MONTH are not set");
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, [email, password]: (string | undefined)[]) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/email/i).fill(email as string);
  await page.getByLabel("Password", { exact: true }).fill(password as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

/** fetch() from the signed-in page, so the session cookie goes with it. */
async function api(page: Page, url: string, init?: { method?: string; body?: unknown }) {
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

async function userIdFor(page: Page, email: string): Promise<string> {
  const res = await api(page, `/api/hr/employees?limit=100`);
  const body = res.json as { data?: unknown[] } | unknown[];
  const rows = (Array.isArray(body) ? body : body?.data ?? []) as Array<{ id: string; email?: string }>;
  const hit = rows.find((r) => r.email?.toLowerCase() === email.toLowerCase());
  expect(hit, `employee ${email}`).toBeTruthy();
  return hit!.id;
}

async function pdfTextOf(page: Page, payrollId: number): Promise<string> {
  const pdfBase64 = await page.evaluate(async (id) => {
    const res = await fetch(`/api/hr/payrolls/${id}/download`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }, payrollId);
  const { PDFParse } = (await import("pdf-parse")) as unknown as {
    PDFParse: new (o: { data: Buffer }) => { getText: () => Promise<{ text: string }> };
  };
  return (await new PDFParse({ data: Buffer.from(pdfBase64, "base64") }).getText()).text;
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const ids: { employee?: string; other?: string; hr?: string; payrollId?: number } = {};

test.describe("HR on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("wizard: PT field validates, N/A toggles, review shows it, profile edits it", async ({ page }) => {
    await signIn(page, env.hr);
    await page.goto("/hr/onboarding?tab=wizard");

    await page.getByLabel(/first name/i).fill("QA-TEST");
    await page.getByLabel(/last name/i).fill("Ptwizard");
    await page.getByLabel(/^email/i).fill(`qa-test.pt.${Date.now()}@example.com`);
    await page.getByRole("button", { name: /^next/i }).click();

    await page.getByRole("combobox", { name: /department/i }).click();
    await page.getByRole("option", { name: "Engineering" }).click();
    await page.getByText("e.g. Senior Software Engineer").click();
    await page.getByText("QA-TEST Engineer", { exact: true }).click();
    await page.getByRole("button", { name: /^next/i }).click();

    // The salary label is not tied to its input (wrapper div), so find it by placeholder.
    await page.getByPlaceholder("25000").fill("50000");
    const pt = page.getByLabel("Professional Tax (monthly), rupees");
    await expect(pt).toBeVisible();
    // Keyboard: Tab from the salary box lands on the PT box; its name says rupees.
    await page.getByPlaceholder("25000").focus();
    await page.keyboard.press("Tab");
    await expect(pt).toBeFocused();
    expect((await pt.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await noHorizontalScroll(page)).toBe(true);

    const errors: Record<string, RegExp> = {
      "-1": /valid amount/i,
      "1e9": /valid amount/i,
      abc: /valid amount/i,
      "200.555": /valid amount/i,
      "2501": /cannot exceed/i,
    };
    for (const [bad, message] of Object.entries(errors)) {
      await pt.fill(bad);
      await page.getByRole("button", { name: /^next/i }).click();
      await expect(page.getByText(message)).toBeVisible();
      await expect(pt).toBeVisible(); // Next did not advance
    }

    await page.getByLabel(/not applicable/i).check();
    await expect(pt).toBeDisabled();
    await expect(pt).toHaveValue("");
    await page.getByLabel(/not applicable/i).uncheck();

    await pt.fill("200.5");
    await expect(page.getByText(/-₹200\.5/)).toBeVisible(); // breakdown uses it
    await page.getByRole("button", { name: /^next/i }).click(); // Banking
    await page.getByRole("button", { name: /^next/i }).click(); // Confirm
    await expect(page.getByText("₹200.50 / month")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.getByRole("checkbox").last().check();
    const onboarded = page.waitForResponse((r) => r.url().includes("/api/hr/employees/onboard"));
    await page.getByRole("button", { name: /confirm & onboard/i }).click();
    const response = await onboarded;
    expect(response.status()).toBe(200);
    const { userId } = (await response.json()) as { userId: string };

    await page.goto(`/hr/employees/${userId}`);
    await expect(page.getByText("₹200.50 / month")).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();
    const editor = page.getByLabel("Professional Tax (monthly), rupees");
    expect((await editor.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await editor.fill("-5");
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
    await editor.fill("250");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("₹250.00 / month")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    const audit = await api(page, "/api/audit-log?limit=50");
    expect(audit.text).toContain("PT set to ₹200.50");
    expect(audit.text).toContain("PT ₹200.50 → ₹250.00");
  });
});

test.describe("payroll uses each employee's own PT", () => {
  test("generate, snapshot, over-deduction guard, own-PT rule", async ({ page }) => {
    await signIn(page, env.hr);
    ids.employee = await userIdFor(page, env.employee[0] as string);
    ids.other = await userIdFor(page, env.other as string);
    ids.hr = await userIdFor(page, env.hr[0] as string);
    const ptUrl = (id: string) => `/api/hr/salary-structures/${id}/professional-tax`;

    // A4: a rejected edit writes no audit entry.
    const auditCount = async () =>
      ((await api(page, "/api/audit-log?action=EMPLOYEE_PT_UPDATED&limit=100")).text.match(/"EMPLOYEE_PT_UPDATED"/g) ?? []).length;
    const before = await auditCount();
    expect((await api(page, ptUrl(ids.employee), { method: "PATCH", body: { professionalTax: "-50" } })).status).toBe(400);
    expect(await auditCount()).toBe(before);
    expect((await api(page, ptUrl(ids.employee), { method: "PATCH", body: { professionalTax: "200.50" } })).status).toBe(200);
    expect((await api(page, ptUrl(ids.other), { method: "PATCH", body: { professionalTax: null } })).status).toBe(200);
    // R8: HR may not change their own PT.
    expect((await api(page, ptUrl(ids.hr), { method: "PATCH", body: { professionalTax: "100" } })).status).toBe(403);

    const gen = await api(page, "/api/hr/payrolls/generate", {
      method: "POST",
      body: { userId: ids.employee, month: env.month },
    });
    expect(gen.status, gen.text).toBe(200);
    ids.payrollId = (gen.json as { payrollId: number }).payrollId;
    type Slip = { id: number; ptAmount: string; grossSalary: string; deductions: string; netSalary: string };
    const slipFor = async (userId: string, id?: number) => {
      const list = (await api(page, `/api/hr/payslips?userId=${userId}`)).json as Slip[];
      return list.find((p) => (id ? p.id === id : p.ptAmount != null && (p as { month?: string }).month === env.month));
    };
    const row = (await slipFor(ids.employee, ids.payrollId)) as Slip;
    expect(Number(row.ptAmount)).toBe(200.5);
    expect(Number(row.netSalary)).toBeCloseTo(Number(row.grossSalary) - Number(row.deductions), 2);

    // P6: deductions above gross are refused, not saved as a ₹0 payslip.
    const over = await api(page, "/api/hr/payrolls/generate", {
      method: "POST",
      body: { userId: ids.other, month: env.month, otherDeductions: 10_000_000 },
    });
    expect(over.status).toBe(422);
    expect(over.text).toMatch(/exceed gross/i);

    // P3: not applicable deducts 0.
    const other = await api(page, "/api/hr/payrolls/generate", { method: "POST", body: { userId: ids.other, month: env.month } });
    expect(other.status, other.text).toBe(200);
    const otherRow = await slipFor(ids.other, (other.json as { payrollId: number }).payrollId);
    expect(Number(otherRow?.ptAmount)).toBe(0);
    expect(Number(otherRow?.netSalary)).toBe(Number(otherRow?.grossSalary) - Number(otherRow?.deductions));

    // P5: editing PT after the run leaves the saved payslip alone.
    expect((await api(page, ptUrl(ids.employee), { method: "PATCH", body: { professionalTax: "300" } })).status).toBe(200);
    expect(Number((await slipFor(ids.employee, ids.payrollId))?.ptAmount)).toBe(200.5);
  });

  test("admin approves and pays the payslip", async ({ page }) => {
    await signIn(page, env.admin);
    expect((await api(page, `/api/hr/payrolls/${ids.payrollId}/approve`, { method: "PATCH", body: {} })).status).toBe(200);
    expect((await api(page, `/api/hr/payrolls/${ids.payrollId}/paid`, { method: "PATCH", body: {} })).status).toBe(200);
  });
});

test.describe("HR on tablet and desktop", () => {
  for (const width of [768, 1280]) {
    test(`profile PT row (HR) and permission list (Admin) at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, env.hr);
      ids.employee ??= await userIdFor(page, env.employee[0] as string);
      await page.goto(`/hr/employees/${ids.employee}`);
      await expect(page.getByText(/₹[\d,]+\.\d{2} \/ month/)).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      // The permission matrix is an Admin page.
      await page.context().clearCookies();
      await signIn(page, env.admin);
      await page.goto("/settings/permissions");
      await expect(page.getByText("View other employees' professional tax amount").first()).toBeVisible();
      await expect(page.getByText("Set or change an employee's professional tax amount").first()).toBeVisible();
    });
  }
});

test.describe("Employee", () => {
  test("sees their own PT on the payslip, screen and PDF agree, nothing else", async ({ page }) => {
    await signIn(page, env.employee);
    if (!ids.payrollId) {
      const own = (await api(page, "/api/hr/payslips")).json as Array<{ id: number; month: string }>;
      ids.payrollId = own.find((p) => p.month === env.month)?.id;
    }
    ids.other ??= "another-employee";
    ids.employee ??= (await page.evaluate(async () => (await (await fetch("/api/auth/session")).json()).user.id)) as string;

    const html = await api(page, `/api/hr/payrolls/${ids.payrollId}/download?format=html&toolbar=0`);
    expect(html.status).toBe(200);
    expect(html.text).toContain("Professional Tax");
    expect(html.text).toContain("₹200.50");

    const pdfText = await pdfTextOf(page, ids.payrollId as number);
    expect(pdfText).toContain("Professional Tax");
    expect(pdfText).toMatch(/200\.50/);
    // Net pay matches between the HTML payslip and the PDF.
    const net = /Net (?:Pay|Salary)[^₹\d]*₹?\s*([\d,]+\.\d{2})/i.exec(html.text)?.[1];
    expect(net).toBeTruthy();
    expect(pdfText).toContain(net as string);

    await page.goto("/hr/my-payslips");
    await page.getByRole("combobox", { name: "Select payslip month" }).click();
    await page.getByRole("option").first().click();
    const frame = page.frameLocator("iframe[title^='Payslip for']");
    await expect(frame.getByText("Professional Tax")).toBeVisible();

    // R5/R6: no read or write on anyone else's PT, no leak in the body.
    const other = await api(page, `/api/hr/salary-structures/${ids.other}/professional-tax`);
    expect(other.status).toBe(403);
    expect(other.text).not.toContain("professionalTax");
    expect((await api(page, `/api/hr/salary-structures?userId=${ids.other}`)).status).toBe(403);
    const patch = await api(page, `/api/hr/salary-structures/${ids.employee}/professional-tax`, {
      method: "PATCH",
      body: { professionalTax: "0" },
    });
    expect(patch.status).toBe(403);
  });
});

test.describe("QA plan extras", () => {
  test("Roles page lists the PT permissions; Audit Log page shows the readable diff in IST", async ({ page }) => {
    await signIn(page, env.admin);
    await page.goto("/settings/roles");
    await page.getByRole("button", { name: /^HR \d+ permissions$/ }).click();
    const group = page.getByRole("button", { name: "HR › Payroll › Professional tax 2/2" });
    await expect(group).toBeVisible(); // HR holds both PT permissions
    await group.click();
    await expect(page.getByText("View other employees' professional tax amount").first()).toBeVisible();
    await expect(page.getByText("Set or change an employee's professional tax amount").first()).toBeVisible();

    await page.goto("/settings/audit-log");
    await page.getByRole("row", { name: /Professional tax updated/ }).first().click();
    await expect(page.getByRole("dialog").getByText(/PT (₹[\d,]+\.\d{2}|N\/A) → (₹[\d,]+\.\d{2}|N\/A)/).first()).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/\d{1,2}:\d{2}:\d{2} [ap]m IST/i)).toBeVisible();
  });

  test("onboarding without PT completes and shows Not applicable (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, env.hr);
    await page.goto("/hr/onboarding?tab=wizard");
    await page.getByLabel(/first name/i).fill("QA-TEST");
    await page.getByLabel(/last name/i).fill("Nopt");
    await page.getByLabel(/^email/i).fill(`qa-test.nopt.${Date.now()}@example.com`);
    await page.getByRole("button", { name: /^next/i }).click();
    await page.getByRole("combobox", { name: /department/i }).click();
    await page.getByRole("option", { name: "Engineering" }).click();
    await page.getByText("e.g. Senior Software Engineer").click();
    await page.getByText("QA-TEST Engineer", { exact: true }).click();
    await page.getByRole("button", { name: /^next/i }).click();
    await page.getByPlaceholder("25000").fill("30000");
    await page.getByRole("button", { name: /^next/i }).click();
    await page.getByRole("button", { name: /^next/i }).click();
    await expect(page.getByText("Not applicable")).toBeVisible();
    await page.getByRole("checkbox").last().check();
    const onboarded = page.waitForResponse((r) => r.url().includes("/api/hr/employees/onboard"));
    await page.getByRole("button", { name: /confirm & onboard/i }).click();
    const response = await onboarded;
    expect(response.status()).toBe(200);
    const { userId } = (await response.json()) as { userId: string };
    await page.goto(`/hr/employees/${userId}`);
    await expect(page.getByText("Not applicable")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("P2/P7: a PT-free payslip has no PT line on screen or PDF, figures match", async ({ page }) => {
    await signIn(page, env.admin);
    const otherId = await userIdFor(page, env.other as string);
    const slips = (await api(page, `/api/hr/payslips?userId=${otherId}`)).json as Array<{ id: number; month: string; status: string }>;
    const slip = slips.find((p) => p.month === env.month);
    expect(slip).toBeTruthy();
    if (slip!.status === "DRAFT") {
      expect((await api(page, `/api/hr/payrolls/${slip!.id}/approve`, { method: "PATCH", body: {} })).status).toBe(200);
    }
    if (slip!.status !== "PAID") {
      expect((await api(page, `/api/hr/payrolls/${slip!.id}/paid`, { method: "PATCH", body: {} })).status).toBe(200);
    }
    const html = await api(page, `/api/hr/payrolls/${slip!.id}/download?format=html&toolbar=0`);
    expect(html.text).not.toContain("Professional Tax");
    const pdfText = await pdfTextOf(page, slip!.id);
    expect(pdfText).not.toContain("Professional Tax");
    const net = /Net (?:Pay|Salary)[^₹\d]*₹?\s*([\d,]+\.\d{2})/i.exec(html.text)?.[1];
    expect(net).toBeTruthy();
    expect(pdfText).toContain(net as string);
  });

  test("Employee payslip view at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, env.employee);
    await page.goto("/hr/my-payslips");
    await page.getByRole("combobox", { name: "Select payslip month" }).click();
    await page.getByRole("option").first().click();
    await expect(page.frameLocator("iframe[title^='Payslip for']").getByText("Professional Tax")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("R7: a deactivated user gets 401/403 on PT endpoints", async ({ browser }) => {
    const victim = await browser.newPage();
    await signIn(victim, env.hr);
    const hrId = await userIdFor(victim, env.hr[0] as string);
    const targetId = await userIdFor(victim, env.other as string);

    const admin = await browser.newPage();
    await signIn(admin, env.admin);
    expect((await api(admin, `/api/hr/employees/${hrId}/active`, { method: "PATCH", body: { isActive: false } })).status).toBe(200);
    try {
      const get = await api(victim, `/api/hr/salary-structures/${targetId}/professional-tax`);
      expect([401, 403]).toContain(get.status);
      expect(get.text).not.toContain("professionalTax");
      const patch = await api(victim, `/api/hr/salary-structures/${targetId}/professional-tax`, {
        method: "PATCH",
        body: { professionalTax: "100" },
      });
      expect([401, 403]).toContain(patch.status);
    } finally {
      expect((await api(admin, `/api/hr/employees/${hrId}/active`, { method: "PATCH", body: { isActive: true } })).status).toBe(200);
    }
  });
});
