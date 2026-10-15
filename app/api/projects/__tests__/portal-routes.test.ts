import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const resolveAccess = vi.fn();
const grantMock = vi.fn();
const portalOn = vi.fn();
const completeMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/projects/project-access", () => ({ resolveProjectAccess: (...a: unknown[]) => resolveAccess(...a) }));
vi.mock("@/lib/projects/client-access", () => ({
  resolveClientGrant: (...a: unknown[]) => grantMock(...a),
  clientPortalEnabled: (...a: unknown[]) => portalOn(...a),
  activeGrantWhere: () => undefined,
}));
vi.mock("@/lib/projects/complete-cycle", () => ({ completeCycle: (...a: unknown[]) => completeMock(...a) }));
vi.mock("@/lib/projects/cycle-detail", () => ({ loadCycleDetail: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));

const json = (body: unknown, method = "POST") =>
  ({ method, body: JSON.stringify(body), headers: { "content-type": "application/json" } }) as const;
const req = (init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest("http://localhost/x", init);
const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "client", role: "SALES", isActive: true }, orgId: "org1" });
  resolveAccess.mockResolvedValue({ ok: true, role: "MANAGER" });
  portalOn.mockResolvedValue(true);
});

describe("client portal project", () => {
  it("returns 404 without an active grant, never 403", async () => {
    grantMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/portal/projects/[projectId]/route");
    expect((await GET(req(), p({ projectId: "1" }))).status).toBe(404);
  });

  it("returns 404 for a bad id without looking up a grant", async () => {
    const { GET } = await import("@/app/api/portal/projects/[projectId]/route");
    expect((await GET(req(), p({ projectId: "1;drop" }))).status).toBe(404);
    expect(grantMock).not.toHaveBeenCalled();
  });

  it("forbids requests when the grant does not allow them", async () => {
    grantMock.mockResolvedValue({ id: 1, projectId: 1, canSubmitRequests: false });
    const { POST } = await import("@/app/api/portal/projects/[projectId]/requests/route");
    expect((await POST(req(json({ title: "Need X" })), p({ projectId: "1" }))).status).toBe(403);
  });
});

describe("client grants admin", () => {
  it("returns 404 when the portal is off", async () => {
    portalOn.mockResolvedValue(false);
    const { GET } = await import("@/app/api/projects/[projectId]/client-grants/route");
    expect((await GET(req(), p({ projectId: "1" }))).status).toBe(404);
  });

  it("returns 403 for contributors", async () => {
    resolveAccess.mockResolvedValue({ ok: false, status: 403 });
    const { POST } = await import("@/app/api/projects/[projectId]/client-grants/route");
    expect((await POST(req(json({ email: "c@x.io" })), p({ projectId: "1" }))).status).toBe(403);
  });

  it("rejects unknown capability fields", async () => {
    const { POST } = await import("@/app/api/projects/[projectId]/client-grants/route");
    expect((await POST(req(json({ email: "c@x.io", canDeleteEverything: true })), p({ projectId: "1" }))).status).toBe(400);
  });
});

describe("cycle completion", () => {
  const load = () => import("@/app/api/projects/[projectId]/cycles/[cycleId]/route");

  it("maps an invalid carry-over target to 400", async () => {
    completeMock.mockResolvedValue({ kind: "invalid_target", message: "That cycle is not in this project" });
    const { PATCH } = await load();
    const res = await PATCH(req(json({ status: "completed", carryForwardCycleId: 99 }, "PATCH")), p({ projectId: "1", cycleId: "2" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing cycle", async () => {
    completeMock.mockResolvedValue({ kind: "not_found" });
    const { PATCH } = await load();
    expect((await PATCH(req(json({ status: "completed" }, "PATCH")), p({ projectId: "1", cycleId: "2" }))).status).toBe(404);
  });

  it("reports how many tickets moved", async () => {
    completeMock.mockResolvedValue({ kind: "done", carried: 3 });
    const { PATCH } = await load();
    const res = await PATCH(req(json({ status: "completed", carryForwardCycleId: 5 }, "PATCH")), p({ projectId: "1", cycleId: "2" }));
    expect(await res.json()).toMatchObject({ carried: 3 });
  });
});

describe("intake token", () => {
  it("returns 403 for contributors", async () => {
    resolveAccess.mockResolvedValue({ ok: false, status: 403 });
    const { POST } = await import("@/app/api/projects/[projectId]/intake/token/route");
    expect((await POST(req(json({ enabled: true })), p({ projectId: "1" }))).status).toBe(403);
  });
});
