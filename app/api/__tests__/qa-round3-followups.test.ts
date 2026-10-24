import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Round 3 follow-ups: HR is turned away from the org-wide APIs behind
 * Organization and System Health, and an Employee can change their own
 * profile photo (only the photo, only their own record).
 */
const authMock = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const select = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  invalidateUserSession: async () => {},
}));
// Lets the test read which user the update targets.
vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  eq: (_col: unknown, value: unknown) => ({ eq: value }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: (...a: unknown[]) => {
      select(...a);
      throw new Error("no reads expected");
    },
    update: () => ({
      set: (data: unknown) => {
        updateSet(data);
        return { where: async (w: unknown) => updateWhere(w) };
      },
    }),
  },
}));

function signIn(role: string, id = "actor") {
  authMock.mockResolvedValue({ user: { id, role, isActive: true }, orgId: "org1" });
}
const patch = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => vi.clearAllMocks());

describe("HR cannot use the org-wide APIs", () => {
  it.each(["HR", "EMPLOYEE"])("GET /api/dashboard/admin-health as %s is 403", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/dashboard/admin-health/route");
    expect((await GET(new NextRequest("http://localhost/x"))).status).toBe(403);
    expect(select).not.toHaveBeenCalled();
  });

  it.each([
    ["settings", () => import("@/app/api/organization/settings/route")],
    ["security", () => import("@/app/api/organization/security/route")],
  ])("PATCH /api/organization/%s as HR is 403", async (_name, load) => {
    signIn("HR");
    const { PATCH } = await load();
    expect((await PATCH(patch({ passwordExpiryDays: 90 }))).status).toBe(403);
    expect(updateSet).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/hr/my-profile/photo (self-service photo)", () => {
  const load = () => import("@/app/api/hr/my-profile/photo/route");

  it("an Employee sets their own photo, and nothing else is written", async () => {
    signIn("EMPLOYEE", "emp-1");
    const { PATCH } = await load();
    const res = await PATCH(patch({ image: "/uploads/avatars/me.jpg", name: "New Name", role: "ADMIN" }));
    expect(res.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith({ image: "/uploads/avatars/me.jpg" });
    expect(updateWhere).toHaveBeenCalledWith({ eq: "emp-1" });
  });

  it("an empty string removes the photo", async () => {
    signIn("EMPLOYEE", "emp-1");
    const { PATCH } = await load();
    expect((await PATCH(patch({ image: "" }))).status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith({ image: null });
  });

  it("rejects a value that is not an uploaded file or URL", async () => {
    signIn("EMPLOYEE", "emp-1");
    const { PATCH } = await load();
    expect((await PATCH(patch({ image: "javascript:alert(1)" }))).status).toBe(400);
    expect(updateSet).not.toHaveBeenCalled();
  });
});
