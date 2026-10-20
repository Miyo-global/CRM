import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const update = vi.fn(async (..._a: unknown[]): Promise<unknown> => ({ id: 1 }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/cache", () => ({ invalidateCache: vi.fn(), CACHE_KEYS: { announcementsList: () => "k" } }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
    },
  },
}));
vi.mock("@/server/queries/dashboard", () => ({ updateAnnouncement: (...a: unknown[]) => update(...a) }));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "self", role, isActive: true }, orgId: "org1" });
}

const patch = async () => {
  const { PATCH } = await import("@/app/api/dashboard/announcements/route");
  return PATCH(
    new NextRequest("http://localhost/api/dashboard/announcements?id=1", {
      method: "PATCH",
      body: JSON.stringify({ content: "Updated" }),
    }),
  );
};

beforeEach(() => {
  authMock.mockReset();
  update.mockClear();
});

describe("announcement edit (BUG-16)", () => {
  it("lets an admin edit any announcement", async () => {
    signIn("HR");
    expect((await patch()).status).toBe(200);
    expect(update.mock.calls[0][3]).toBeUndefined();
  });

  it("limits anyone else to their own announcement", async () => {
    signIn("ENGINEERING");
    update.mockResolvedValueOnce(null);
    expect((await patch()).status).toBe(404);
    expect(update.mock.calls[0][3]).toBe("self");
  });
});
