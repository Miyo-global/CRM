import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/db", () => ({ db: { query: { userSessions: { findFirst: async () => null } } } }));
vi.mock("@/lib/storage", () => ({
  isStorageConfigured: () => true,
  getFileUrl: async () => "https://signed.example/x",
  getFileKeyFromUrl: (u: string) => u,
  getFileStream: async () => ({ body: null, contentType: "image/png" }),
  getFileNameFromKey: (k: string) => k,
  getOrgIdFromKey: (k: string) => k.split("/")[0],
  uploadFile: async () => ({}),
}));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => {} }));

const download = await import("../download/route");
const image = await import("../image/route");

const req = (path: string) => new NextRequest(`http://localhost/api/storage/${path}`);

describe("storage routes use withAuth (MIYO-0022)", () => {
  it("deactivated user gets 403 on download and image", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", isActive: false }, orgId: "org1" });
    expect((await download.GET(req("download?key=org1/a.pdf"))).status).toBe(403);
    expect((await image.GET(req("image?key=org1/a.png"))).status).toBe(403);
  });

  it("session that has not passed MFA gets 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", isActive: true }, orgId: "org1", mfaSatisfied: false });
    expect((await download.GET(req("download?key=org1/a.pdf"))).status).toBe(403);
  });

  it("active user in the key's org gets a signed URL", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", isActive: true }, orgId: "org1" });
    const res = await download.GET(req("download?key=org1/a.pdf"));
    expect(res.status).toBe(200);
  });
});
