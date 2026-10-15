import { beforeEach, describe, expect, it, vi } from "vitest";

const findProject = vi.fn();
const findMember = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      projects: { findFirst: (...args: unknown[]) => findProject(...args) },
      projectMembers: { findFirst: (...args: unknown[]) => findMember(...args) },
    },
  },
}));

import { decideProjectAccess, resolveProjectAccess, type ProjectAction } from "./project-access";
import { normalizeProjectRole } from "./project-roles";

const project = { orgId: "org-a", managerId: "manager", deletedAt: null };
const base = { sessionOrgId: "org-a", userId: "user", orgRole: "ENGINEERING", project, memberRole: null, isMember: false };
const actions: ProjectAction[] = ["view", "contribute", "manage"];

describe("decideProjectAccess", () => {
  it("returns 404 for a missing project", () => {
    expect(decideProjectAccess({ ...base, project: null }, "view")).toEqual({ ok: false, status: 404 });
  });

  it("returns 404 for a project in another org, even for an org admin", () => {
    const other = { ...project, orgId: "org-b" };
    for (const orgRole of ["CEO", "ENGINEERING"]) {
      expect(decideProjectAccess({ ...base, orgRole, project: other, isMember: true, memberRole: "OWNER" }, "view"))
        .toEqual({ ok: false, status: 404 });
    }
  });

  it("returns 404 for a deleted project", () => {
    const deleted = { ...project, deletedAt: new Date() };
    expect(decideProjectAccess({ ...base, orgRole: "CEO", project: deleted }, "view")).toEqual({ ok: false, status: 404 });
  });

  it("returns 404 for a non-member so the project stays hidden", () => {
    for (const action of actions) {
      expect(decideProjectAccess(base, action)).toEqual({ ok: false, status: 404 });
    }
  });

  it.each(["CEO", "HR", "ADMIN"])("treats org role %s as OWNER for every action", (orgRole) => {
    for (const action of actions) {
      expect(decideProjectAccess({ ...base, orgRole }, action)).toEqual({ ok: true, role: "OWNER" });
    }
  });

  it("treats the project manager as MANAGER without a member row", () => {
    const input = { ...base, userId: "manager" };
    for (const action of actions) {
      expect(decideProjectAccess(input, action)).toEqual({ ok: true, role: "MANAGER" });
    }
  });

  const matrix: [string, ProjectAction, boolean][] = [
    ["OWNER", "view", true], ["OWNER", "contribute", true], ["OWNER", "manage", true],
    ["MANAGER", "view", true], ["MANAGER", "contribute", true], ["MANAGER", "manage", true],
    ["CONTRIBUTOR", "view", true], ["CONTRIBUTOR", "contribute", true], ["CONTRIBUTOR", "manage", false],
    ["VIEWER", "view", true], ["VIEWER", "contribute", false], ["VIEWER", "manage", false],
  ];

  it.each(matrix)("member role %s, action %s, allowed %s", (memberRole, action, allowed) => {
    const decision = decideProjectAccess({ ...base, isMember: true, memberRole }, action);
    expect(decision).toEqual(allowed ? { ok: true, role: memberRole } : { ok: false, status: 403 });
  });
});

describe("normalizeProjectRole", () => {
  it("maps legacy and unknown roles", () => {
    expect(normalizeProjectRole("admin")).toBe("MANAGER");
    expect(normalizeProjectRole(" viewer ")).toBe("VIEWER");
    expect(normalizeProjectRole("something")).toBe("CONTRIBUTOR");
    expect(normalizeProjectRole(null)).toBe("CONTRIBUTOR");
  });
});

describe("resolveProjectAccess", () => {
  const session = { user: { id: "user", role: "ENGINEERING" }, orgId: "org-a" };

  beforeEach(() => {
    findProject.mockReset();
    findMember.mockReset();
  });

  it.each([0, -1, Number.NaN, 1.5])("returns 404 for invalid project id %s without querying", async (id) => {
    expect(await resolveProjectAccess(session, id, "view")).toEqual({ ok: false, status: 404 });
    expect(findProject).not.toHaveBeenCalled();
  });

  it("returns 404 when the org-scoped lookup finds nothing", async () => {
    findProject.mockResolvedValue(undefined);
    expect(await resolveProjectAccess(session, 7, "view")).toEqual({ ok: false, status: 404 });
    expect(findMember).not.toHaveBeenCalled();
  });

  it("returns 403 when a viewer tries to contribute", async () => {
    findProject.mockResolvedValue(project);
    findMember.mockResolvedValue({ role: "VIEWER" });
    expect(await resolveProjectAccess(session, 7, "contribute")).toEqual({ ok: false, status: 403 });
  });

  it("allows a contributor to contribute", async () => {
    findProject.mockResolvedValue(project);
    findMember.mockResolvedValue({ role: "CONTRIBUTOR" });
    expect(await resolveProjectAccess(session, 7, "contribute")).toEqual({ ok: true, role: "CONTRIBUTOR" });
  });
});
