import { expect, test } from "@playwright/test";

/**
 * R3-EMP-05: a ticket typed as "QA-TEST ticket" was stored as "QA-". Types the
 * title fast (no delay), both key by key and as one fill, and checks the
 * stored title. Needs E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD and a running
 * app; creates two QA-TEST tickets. Run with `pnpm test:e2e`.
 */
const EMP = { email: process.env.E2E_EMPLOYEE_EMAIL, password: process.env.E2E_EMPLOYEE_PASSWORD };

test.skip(!EMP.email || !EMP.password, "E2E employee login is not set");

for (const mode of ["keys", "fill"] as const) {
  test(`helpdesk title is stored as typed (${mode})`, async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel(/email/i).fill(EMP.email as string);
    await page.getByLabel(/password/i).fill(EMP.password as string);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);

    const title = `QA-TEST ticket ${mode} ${Date.now()}`;
    await page.goto("/hr/helpdesk");
    await page.getByRole("button", { name: "New Ticket" }).click();
    const sheet = page.getByRole("dialog");
    // Category first, so the form turns valid while the title is still being typed.
    await sheet.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "HR Query" }).click();
    const input = sheet.getByPlaceholder("Brief description of the issue");
    if (mode === "keys") await input.pressSequentially(title);
    else await input.fill(title);
    await sheet.getByPlaceholder("Provide more details...").fill("QA-TEST");
    await sheet.getByRole("button", { name: "Create Ticket" }).click();
    await expect(page.getByText("Ticket created successfully")).toBeVisible();

    const tickets = (await (await page.request.get("/api/hr/helpdesk")).json()) as { title: string }[];
    expect(tickets.map((t) => t.title)).toContain(title);
  });
}
