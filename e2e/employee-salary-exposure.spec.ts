import { expect, test } from "@playwright/test";

/**
 * R3-NET-01: an Employee opening /projects must never receive anyone's
 * salary, phone, bio or social links from the people pickers' API calls.
 *
 * Needs a running app and an Employee-role login in E2E_EMPLOYEE_EMAIL /
 * E2E_EMPLOYEE_PASSWORD. Run with `pnpm test:e2e`.
 */
const EMAIL = process.env.E2E_EMPLOYEE_EMAIL;
const PASSWORD = process.env.E2E_EMPLOYEE_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_EMPLOYEE_EMAIL and E2E_EMPLOYEE_PASSWORD are not set");

const SENSITIVE = ["monthlySalary", "phone", "bio", "linkedinUrl", "twitterUrl", "githubUrl", "websiteUrl", "reportingTo"];

test("/projects as Employee gets no salary or personal fields", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(EMAIL as string);
  await page.getByLabel(/password/i).fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  const selfId = await page.evaluate(async () => {
    const s = (await (await fetch("/api/auth/session")).json()) as { user?: { id?: string } } | null;
    return s?.user?.id ?? "";
  });

  const bodies: { url: string; cacheControl: string | undefined; json: unknown }[] = [];
  page.on("response", async (res) => {
    if (!res.url().includes("/api/") || !res.headers()["content-type"]?.includes("json")) return;
    try {
      bodies.push({ url: res.url(), cacheControl: res.headers()["cache-control"], json: await res.json() });
    } catch {
      // Body already consumed or not JSON.
    }
  });

  await page.goto("/projects");
  await page.waitForLoadState("networkidle");

  const leaks: string[] = [];
  const walk = (node: unknown, url: string) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, url));
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // Your own record may carry your own salary.
      if (obj.id !== selfId) {
        for (const key of SENSITIVE) if (obj[key] != null) leaks.push(`${url} -> ${key}`);
      }
      Object.values(obj).forEach((v) => walk(v, url));
    }
  };
  for (const b of bodies) walk(b.json, b.url);

  expect(leaks).toEqual([]);
  // R3-NET-02: no authenticated JSON may be publicly cacheable.
  for (const b of bodies) expect(b.cacheControl ?? "", b.url).not.toMatch(/public/);
});
