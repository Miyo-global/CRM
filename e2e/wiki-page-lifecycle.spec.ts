import { expect, test } from "@playwright/test";

/**
 * R3-PRJ-05 / R3-KB-01: New page opens the editor, the title survives a
 * reload, Delete moves it to Trash, and no wiki page requests a 404.
 *
 * Needs a running app and a login that may create org-level pages (Admin or
 * Super Admin) in E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. Run with `pnpm test:e2e`.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are not set");

test("wiki page: create, edit, reload, delete to Trash, no 404s", async ({ page }) => {
  const notFound: string[] = [];
  page.on("response", (res) => {
    if (res.status() === 404 && res.url().includes("/knowledge")) notFound.push(res.url());
  });

  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/knowledge/wiki");
  await expect(page.getByRole("link", { name: "Search" })).toHaveCount(0);

  await page.getByRole("button", { name: "New page" }).first().click();
  await expect(page).toHaveURL(/\/knowledge\/wiki\/doc\/\d+$/);
  const title = page.getByLabel("Page title");
  await expect(title).toBeVisible();

  const name = `QA-TEST wiki ${Date.now()}`;
  await title.fill(name);
  await page.locator(".tiptap").click();
  await page.keyboard.type("Body written by the e2e test.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Page saved")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Page title")).toHaveValue(name);
  await expect(page.locator(".tiptap")).toContainText("Body written by the e2e test.");

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  await expect(page).toHaveURL(/\/knowledge\/wiki\/trash/);
  await expect(page.getByText(name).first()).toBeVisible();

  expect(notFound).toEqual([]);
});
