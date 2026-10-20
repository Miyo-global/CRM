import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { query: { roles: { findFirst: async () => undefined } } },
}));

import { canChangeRoleOf, checkRoleAssignment } from "./role-assignment";

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

  it("lets the Super Admin grant ADMIN and HR set an ordinary role", async () => {
    expect(await checkRoleAssignment({ ...base, actorRole: "CEO", newRole: "ADMIN" })).toBeNull();
    expect(await checkRoleAssignment({ ...base, actorRole: "HR", newRole: "EMPLOYEE" })).toBeNull();
  });

  it("rejects unknown roles and self-changes", async () => {
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", newRole: "WIZARD" }))?.status).toBe(400);
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", targetUserId: "actor", newRole: "HR" }))?.status).toBe(403);
  });
});

describe("the Super Admin is locked (QA-AUTH-01, QA-AUTH-02)", () => {
  it("never grants Super Admin, not even from the Super Admin", async () => {
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", newRole: "CEO" }))?.status).toBe(403);
  });

  it("stops an Admin demoting the owner or minting Admins", async () => {
    expect((await checkRoleAssignment({ ...base, actorRole: "ADMIN", targetCurrentRole: "CEO", newRole: "EMPLOYEE" }))?.status).toBe(403);
    expect((await checkRoleAssignment({ ...base, actorRole: "ADMIN", newRole: "ADMIN" }))?.status).toBe(403);
    expect((await checkRoleAssignment({ ...base, actorRole: "ADMIN", targetCurrentRole: "HR", newRole: "EMPLOYEE" }))?.status).toBe(403);
  });

  it("refuses the retired job-title roles", async () => {
    expect((await checkRoleAssignment({ ...base, actorRole: "CEO", targetCurrentRole: "EMPLOYEE", newRole: "SALES" }))?.status).toBe(400);
    // Leaving a legacy role in place is not an assignment.
    expect(await checkRoleAssignment({ ...base, actorRole: "HR", targetCurrentRole: "SALES", newRole: "SALES" })).toBeNull();
  });

  it("shows the role control only where a change is allowed", () => {
    const admin = { userId: "a", role: "ADMIN" };
    const owner = { userId: "o", role: "CEO" };
    expect(canChangeRoleOf(admin, { userId: "o", role: "CEO" })).toBe(false);
    expect(canChangeRoleOf(admin, { userId: "a", role: "ADMIN" })).toBe(false);
    expect(canChangeRoleOf(admin, { userId: "b", role: "ADMIN" })).toBe(false);
    expect(canChangeRoleOf(admin, { userId: "e", role: "EMPLOYEE" })).toBe(true);
    expect(canChangeRoleOf(owner, { userId: "b", role: "ADMIN" })).toBe(true);
    expect(canChangeRoleOf(owner, { userId: "o", role: "CEO" })).toBe(false);
    expect(canChangeRoleOf({ userId: "e", role: "EMPLOYEE" }, { userId: "x", role: "EMPLOYEE" })).toBe(false);
  });
});
