import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import type { KbPageAction } from "./access-levels";
import {
  decidePageAccess,
  decideSpaceAccess,
  isKbAdmin,
  type KbActor,
  type KbPageRow,
  type PageAccessContext,
} from "./authorization";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";

const ACTOR: KbActor = { userId: "u1", orgId: "org-a", role: "ENGINEERING", permissions: [] };

const PAGE: KbPageRow = {
  id: 5,
  orgId: "org-a",
  spaceId: 11,
  projectId: null,
  visibility: "org",
  ownerUserId: null,
  createdById: "someone-else",
  deletedAt: null,
};

function ctx(overrides: Partial<PageAccessContext> = {}): PageAccessContext {
  return {
    actor: ACTOR,
    page: PAGE,
    isKbAdmin: false,
    canEditOrgWide: false,
    spaceRole: null,
    projectRole: null,
    grantAccess: null,
    ...overrides,
  };
}

const ACTIONS: KbPageAction[] = ["view", "comment", "edit", "manage"];

describe("decidePageAccess: a page that is not there", () => {
  it("answers notFound for a missing page", () => {
    expect(decidePageAccess(ctx({ page: null }), "view")).toEqual({ outcome: "notFound" });
  });

  it("answers notFound, never denied, for another org's page, even for an admin", () => {
    const other = { ...PAGE, orgId: "org-b" };
    for (const isAdmin of [false, true]) {
      expect(
        decidePageAccess(ctx({ page: other, isKbAdmin: isAdmin }), "view"),
      ).toEqual({ outcome: "notFound" });
    }
  });

  it("answers notFound for a soft-deleted page", () => {
    expect(
      decidePageAccess(ctx({ page: { ...PAGE, deletedAt: new Date() } }), "view"),
    ).toEqual({ outcome: "notFound" });
  });
});

describe("decidePageAccess: org pages", () => {
  it("lets every role read an org page", () => {
    for (const role of SYSTEM_ROLES) {
      const decision = decidePageAccess(ctx({ actor: { ...ACTOR, role } }), "view");
      expect(decision.outcome, role).toBe("allowed");
      if (decision.outcome === "allowed") expect(decision.scope.via).toBe("organization");
    }
  });

  it("does not let a reader edit one without kb:pages:update or a seat", () => {
    const decision = decidePageAccess(ctx(), "edit");
    expect(decision.outcome).toBe("denied");
  });

  it("lets kb:pages:update edit it", () => {
    expect(decidePageAccess(ctx({ canEditOrgWide: true }), "edit").outcome).toBe("allowed");
    expect(decidePageAccess(ctx({ canEditOrgWide: true }), "manage").outcome).toBe("denied");
  });
});

describe("decidePageAccess: private pages", () => {
  const privatePage = { ...PAGE, visibility: "private" as const };

  it("hides a private page from the org, including from a space editor", () => {
    expect(decidePageAccess(ctx({ page: privatePage }), "view")).toEqual({
      outcome: "notFound",
    });
    expect(
      decidePageAccess(ctx({ page: privatePage, spaceRole: "editor" }), "view"),
    ).toEqual({ outcome: "notFound" });
  });

  it("opens it to its creator, its owner, a grantee and an admin", () => {
    const creator = ctx({ page: { ...privatePage, createdById: "u1" } });
    expect(decidePageAccess(creator, "manage").outcome).toBe("allowed");

    const owner = ctx({ page: { ...privatePage, ownerUserId: "u1" } });
    expect(decidePageAccess(owner, "manage").outcome).toBe("allowed");

    const grantee = ctx({ page: privatePage, grantAccess: "comment" });
    expect(decidePageAccess(grantee, "comment").outcome).toBe("allowed");
    expect(decidePageAccess(grantee, "edit").outcome).toBe("denied");

    const admin = ctx({ page: privatePage, isKbAdmin: true });
    expect(decidePageAccess(admin, "manage").outcome).toBe("allowed");
  });
});

describe("decidePageAccess: the route matrix", () => {
  const cases: Array<[string, Partial<PageAccessContext>, KbPageAction]> = [
    ["admin", { isKbAdmin: true }, "manage"],
    ["owner", { page: { ...PAGE, ownerUserId: "u1" } }, "manage"],
    ["creator", { page: { ...PAGE, createdById: "u1" } }, "manage"],
    ["space viewer", { spaceRole: "viewer" }, "view"],
    ["space commenter", { spaceRole: "commenter" }, "comment"],
    ["space editor", { spaceRole: "editor" }, "edit"],
    ["space publisher", { spaceRole: "publisher" }, "edit"],
    ["space admin", { spaceRole: "admin" }, "manage"],
    ["project contributor", { page: { ...PAGE, projectId: 3 }, projectRole: "contribute" }, "edit"],
    ["project manager", { page: { ...PAGE, projectId: 3 }, projectRole: "manage" }, "manage"],
    ["grant edit", { grantAccess: "edit" }, "edit"],
    ["grant manage", { grantAccess: "manage" }, "manage"],
  ];

  for (const [label, overrides, highest] of cases) {
    it(`${label} reaches ${highest} and no further`, () => {
      const context = ctx(overrides);
      for (const action of ACTIONS) {
        const decision = decidePageAccess(context, action);
        const shouldPass = ACTIONS.indexOf(action) <= ACTIONS.indexOf(highest);
        expect(decision.outcome, `${label} ${action}`).toBe(shouldPass ? "allowed" : "denied");
      }
    });
  }

  it("takes the strongest route, so a viewer seat does not shadow an edit grant", () => {
    const decision = decidePageAccess(ctx({ spaceRole: "viewer", grantAccess: "edit" }), "edit");
    expect(decision.outcome).toBe("allowed");
    if (decision.outcome === "allowed") expect(decision.scope.via).toBe("grant");
  });

  it("ignores a space seat for a page with no space", () => {
    const decision = decidePageAccess(
      ctx({ page: { ...PAGE, spaceId: null }, spaceRole: "editor" }),
      "edit",
    );
    expect(decision.outcome).toBe("denied");
  });
});

describe("isKbAdmin", () => {
  it("is true for CEO, ADMIN and HR, and for kb:pages:manage", () => {
    for (const role of ["CEO", "ADMIN", "HR"]) {
      expect(isKbAdmin({ ...ACTOR, role }), role).toBe(true);
    }
    expect(isKbAdmin({ ...ACTOR, role: "SALES" })).toBe(false);
    expect(isKbAdmin({ ...ACTOR, role: "SALES", permissions: ["kb:pages:manage"] })).toBe(true);
  });
});

describe("decideSpaceAccess", () => {
  const space = { id: 11, orgId: "org-a", deletedAt: null, createdById: "someone-else" };

  it("answers notFound for another org's space", () => {
    expect(
      decideSpaceAccess(
        {
          actor: ACTOR,
          space: { ...space, orgId: "org-b" },
          spaceRole: "admin",
          isKbAdmin: true,
          canViewOrgWide: true,
        },
        "view",
      ),
    ).toEqual({ outcome: "notFound" });
  });

  it("lets kb:spaces:view read it and an editor seat edit in it", () => {
    const base = { actor: ACTOR, space, isKbAdmin: false };
    expect(
      decideSpaceAccess({ ...base, spaceRole: null, canViewOrgWide: true }, "view").outcome,
    ).toBe("allowed");
    expect(
      decideSpaceAccess({ ...base, spaceRole: null, canViewOrgWide: true }, "edit").outcome,
    ).toBe("denied");
    expect(
      decideSpaceAccess({ ...base, spaceRole: "editor", canViewOrgWide: true }, "edit").outcome,
    ).toBe("allowed");
  });

  it("answers notFound when there is no route at all", () => {
    expect(
      decideSpaceAccess(
        { actor: ACTOR, space, spaceRole: null, isKbAdmin: false, canViewOrgWide: false },
        "view",
      ),
    ).toEqual({ outcome: "notFound" });
  });
});
