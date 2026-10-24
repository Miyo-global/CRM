import { expect, test, type Page } from "@playwright/test";

/**
 * R3-RSP-01 / R3-RSP-02: at 375, 768, 1024 and 1440 px the table pages keep
 * their row actions on screen (pinned inside the table's scroll container, or
 * in the card list on phones), and the module nav never wraps.
 *
 * Screenshots land in test-results/ (Playwright's output dir). Needs a running
 * app and a Super Admin login in E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD.
 * Run with `pnpm test:e2e e2e/responsive-tables.spec.ts`.
 */
const EMAIL = process.env.E2E_SUPERADMIN_EMAIL;
const PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD are not set");

const WIDTHS = [375, 768, 1024, 1440];
const PAGES = ["/hr/payroll", "/settings/members", "/hr", "/settings/audit-log"];

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

/**
 * Every visible control in a table's last (actions) column must sit inside
 * both the viewport and the visible part of its scroll container.
 */
async function offscreenActions(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad: string[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    for (const container of document.querySelectorAll('[data-slot="table-container"]')) {
      if (!visible(container)) continue;
      const box = container.getBoundingClientRect();
      const right = Math.min(box.right, vw);
      const left = Math.max(box.left, 0);
      for (const row of container.querySelectorAll("tbody tr")) {
        const cell = row.lastElementChild;
        if (!cell || cell.hasAttribute("colspan")) continue;
        for (const ctl of cell.querySelectorAll("button, a, [role=combobox]")) {
          if (!visible(ctl)) continue;
          const r = ctl.getBoundingClientRect();
          if (r.left < left - 1 || r.right > right + 1) {
            bad.push(`${ctl.getAttribute("aria-label") ?? ctl.textContent?.trim()} at ${Math.round(r.left)}-${Math.round(r.right)} (visible ${Math.round(left)}-${Math.round(right)})`);
          }
        }
      }
    }
    return bad;
  });
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

for (const width of WIDTHS) {
  test(`tables keep row actions on screen at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: testInfo.outputPath(`${path.replace(/\W+/g, "_").replace(/^_/, "")}-${width}.png`),
        fullPage: true,
      });
      expect(await offscreenActions(page), `${path} at ${width}px`).toEqual([]);
      // Nothing may push the page itself sideways.
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow, `${path} page scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}

test("module nav stays on one line at 1100px (R3-RSP-01)", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/projects");
  const nav = page.getByRole("navigation", { name: "Modules" });
  await expect(nav).toBeVisible();
  const heights = await nav
    .locator("a:visible, button:visible")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeLessThan(40);
});
