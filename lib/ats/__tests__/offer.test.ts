import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * MIYO-0685: the offer link. Only its hash is stored, it works once, and
 * an expired link is refused rather than quietly accepted.
 */
vi.mock("@/lib/constants/modules", () => ({ ATS_MODULE_ENABLED: true }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfterSecs: 0 }),
}));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => undefined }));

const sendOfferResponseEmail = vi.fn(async () => undefined);
const found = {
  value: null as null | {
    offer: Record<string, unknown>;
    candidateFirstName: string;
    candidateLastName: string;
    candidateEmail: string;
    jobTitle: string | null;
    jobLocation: string | null;
    expired: boolean;
  },
};

vi.mock("@/lib/ats/offers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ats/offers")>("@/lib/ats/offers");
  return {
    ...actual,
    offerByToken: async () => found.value,
    sendOfferResponseEmail: () => sendOfferResponseEmail(),
  };
});

const updates: Record<string, unknown>[] = [];
vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
    insert: () => ({ values: async () => undefined }),
    select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => [] }) }) }),
  },
}));
vi.mock("@/lib/db/schema", () => ({
  atsActivity: { name: "atsActivity" },
  candidateApplications: { name: "candidateApplications" },
  candidateOffers: { name: "candidateOffers" },
  organizationMembers: { name: "organizationMembers" },
  users: { name: "users" },
}));

const { newOfferToken } = await import("@/lib/ats/offers");
const { hashToken } = await import("@/lib/crypto-core");
const { POST } = await import("@/app/api/public/ats/offer-response/route");

function offer(overrides: Record<string, unknown> = {}) {
  return {
    offer: {
      id: 11,
      orgId: "org1",
      candidateId: 9,
      jobPostingId: 7,
      notes: null,
      respondedAt: null,
      offeredDesignation: "Backend Engineer",
      ...overrides,
    },
    candidateFirstName: "Asha",
    candidateLastName: "Rao",
    candidateEmail: "asha@example.com",
    jobTitle: "Backend Engineer",
    jobLocation: "Hyderabad",
    expired: Boolean(overrides.expired),
  };
}

function respond(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/public/ats/offer-response", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  updates.length = 0;
  sendOfferResponseEmail.mockClear();
  found.value = offer();
});

describe("the offer token", () => {
  it("is long, random and only its hash is meant to be stored", () => {
    const a = newOfferToken();
    const b = newOfferToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThan(30);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });
});

describe("POST /api/public/ats/offer-response", () => {
  it("accepts with a typed name and spends the token", async () => {
    const res = await respond({ token: "t".repeat(20), decision: "accept", signedName: "Asha Rao" });
    expect(res.status).toBe(200);
    // The first write is the offer: accepted, answered, token cleared.
    expect(updates[0]).toMatchObject({ offerStatus: "ACCEPTED", tokenHash: null });
    expect(sendOfferResponseEmail).toHaveBeenCalledOnce();
  });

  it("will not accept without a name typed in", async () => {
    const res = await respond({ token: "t".repeat(20), decision: "accept" });
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("records a decline with its reason and clears the token too", async () => {
    const res = await respond({
      token: "t".repeat(20),
      decision: "decline",
      reason: "Took another role",
    });
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({
      offerStatus: "DECLINED",
      declineReason: "Took another role",
      tokenHash: null,
    });
  });

  it("refuses an expired link with 410", async () => {
    found.value = { ...offer(), expired: true };
    expect((await respond({ token: "t".repeat(20), decision: "decline" })).status).toBe(410);
  });

  it("refuses a second answer on the same offer", async () => {
    found.value = offer({ respondedAt: new Date() });
    expect((await respond({ token: "t".repeat(20), decision: "decline" })).status).toBe(409);
  });

  it("refuses a token nobody holds", async () => {
    found.value = null;
    expect((await respond({ token: "t".repeat(20), decision: "decline" })).status).toBe(404);
  });
});
