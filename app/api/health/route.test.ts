import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({ db: { execute: vi.fn(async () => []) } }));
vi.mock("@/lib/redis", () => ({ redisHealth: vi.fn(), isRedisEnabled: () => false, isSharedRedis: () => false }));
vi.mock("@/lib/email/config", () => ({ isEmailConfigured: () => true }));
const adminStatus = vi.hoisted(() => ({ value: 403 }));
vi.mock("@/lib/api/helpers", () => ({
  withAdmin: async () => NextResponse.json({}, { status: adminStatus.value }),
}));

import { GET } from "./route";

const get = (headers: Record<string, string> = {}) =>
  GET(new NextRequest("https://crm.test/api/health", { headers }));

describe("/api/health (QA-SEC-07)", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
    process.env.NEXTAUTH_SECRET = "x";
    adminStatus.value = 403;
  });

  it("tells an anonymous caller only the status", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("does not show detail to a signed-in non-admin", async () => {
    const res = await get({ cookie: "__Secure-authjs.session-token=abc" });
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("shows checks to the cron secret and to an admin", async () => {
    const cron = await (await get({ authorization: "Bearer s3cret" })).json();
    expect(cron.checks.schema).toEqual({ status: "ok" });
    expect(cron).toHaveProperty("latencyMs");

    adminStatus.value = 200;
    const admin = await (await get({ cookie: "__Secure-authjs.session-token=abc" })).json();
    expect(admin).toHaveProperty("checks");
  });

  it("rejects a wrong secret", async () => {
    expect(await (await get({ authorization: "Bearer nope" })).json()).toEqual({ status: "ok" });
  });
});
