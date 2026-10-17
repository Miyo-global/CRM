import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { query: { roles: { findFirst: async () => undefined } } },
}));

import { checkRoleAssignment } from "./role-assignment";

const base = { orgId: "org", actorId: "actor", targetUserId: "target", targetCurrentRole: "ENGINEERING" };

describe("checkRoleAssignment (SEC-0001)", () => {
  it("rejects HR granting CEO or ADMIN", async () => {
    for (const newRole of ["CEO", "ADMIN", "ceo"]) {
      expect((await checkRoleAssignment({ ...base, actorRole: "HR", newRole }))?.status).toBe(403);
    }
  });

  it("rejects HR demoting the CEO", async () => {
    const res = await checkRoleAssignment({ ...base, actorRole: "HR", targetCurrentRole: "CEO", newRole: "ENGINEERING" });
    expect(res?.status).toBe(403);
  });

  it("rejects HR inviting a new user as CEO", async () => {
    expect((await checkRoleAssignment({ orgId: "org", actorId: "actor", actorRole: "HR", newRole: "CEO" }))?.status).toBe(403);
  });

  it("lets the CEO grant ADMIN and HR set an ordinary role", async () => {
    expect(await checkRoleAssignment({ ...base, actorRole: "CEO", newRole: "ADMIN" })).toBeNull();
    expect(await checkRoleAssignment({ ...base, actorRole: "HR", newRole: "SALES" })).toBeNull();
  });

  it("rejects unknown roles and self-changes", async () => {
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", newRole: "WIZARD" }))?.status).toBe(400);
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", targetUserId: "actor", newRole: "HR" }))?.status).toBe(403);
  });
});
