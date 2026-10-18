import { beforeEach, describe, expect, it, vi } from "vitest";

const findSpaceMembers = vi.fn();
const findSpace = vi.fn();
const insertValues = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      kbSpaceMembers: { findMany: (...a: unknown[]) => findSpaceMembers(...a) },
      kbSpaces: { findFirst: (...a: unknown[]) => findSpace(...a) },
    },
    insert: () => ({
      values: (rows: unknown) => {
        insertValues(rows);
        return {
          onConflictDoNothing: () => ({
            returning: async () => insertValues.mock.results.at(-1)?.value ?? [{ id: 99 }],
          }),
        };
      },
    }),
  },
}));

import { decidePageAccess, type KbActor, type KbPageRow } from "./authorization";
import {
  ensurePrivateSpace,
  privateSpaceSlug,
  resolveSpaceRole,
  spaceRoleAction,
  spaceRoleCanPublish,
  spaceRoleSatisfies,
} from "./space-access";

const actor: KbActor = { userId: "u1", orgId: "org-a", role: "SALES", permissions: [] };

beforeEach(() => {
  findSpaceMembers.mockReset();
  findSpace.mockReset();
  insertValues.mockReset();
  insertValues.mockReturnValue([{ id: 99 }]);
});

describe("spaceRoleAction", () => {
  it("maps each seat to its action", () => {
    expect(spaceRoleAction("viewer")).toBe("view");
    expect(spaceRoleAction("commenter")).toBe("comment");
    expect(spaceRoleAction("editor")).toBe("edit");
    expect(spaceRoleAction("publisher")).toBe("edit");
    expect(spaceRoleAction("admin")).toBe("manage");
    expect(spaceRoleAction("nonsense")).toBeNull();
    expect(spaceRoleAction(null)).toBeNull();
  });

  it("keeps publish and verify to publishers and space admins", () => {
    expect(spaceRoleCanPublish("editor")).toBe(false);
    expect(spaceRoleCanPublish("publisher")).toBe(true);
    expect(spaceRoleCanPublish("admin")).toBe(true);
  });

  it("answers satisfies by rank", () => {
    expect(spaceRoleSatisfies("editor", "comment")).toBe(true);
    expect(spaceRoleSatisfies("commenter", "edit")).toBe(false);
    expect(spaceRoleSatisfies(null, "view")).toBe(false);
  });
});

describe("resolveSpaceRole", () => {
  it("takes the strongest of several matching seats", async () => {
    findSpaceMembers.mockResolvedValueOnce([{ spaceRole: "viewer" }, { spaceRole: "editor" }]);
    await expect(resolveSpaceRole(actor, 11)).resolves.toBe("editor");
  });

  it("is null with no seat, and does not query for a bad id", async () => {
    findSpaceMembers.mockResolvedValueOnce([]);
    await expect(resolveSpaceRole(actor, 11)).resolves.toBeNull();
    await expect(resolveSpaceRole(actor, 0)).resolves.toBeNull();
    expect(findSpaceMembers).toHaveBeenCalledTimes(1);
  });
});

describe("a seat is per space", () => {
  const page = (spaceId: number): KbPageRow => ({
    id: 5,
    orgId: "org-a",
    spaceId,
    projectId: null,
    visibility: "org",
    ownerUserId: null,
    createdById: "someone-else",
    deletedAt: null,
  });

  it("lets SALES with editor on space A edit in A and not in B", async () => {
    findSpaceMembers.mockImplementation(async () => []);

    // Space A: the seat is there.
    findSpaceMembers.mockResolvedValueOnce([{ spaceRole: "editor" }]);
    const inA = await resolveSpaceRole(actor, 1);
    expect(
      decidePageAccess(
        {
          actor,
          page: page(1),
          isKbAdmin: false,
          canEditOrgWide: false,
          spaceRole: inA,
          projectRole: null,
          grantAccess: null,
        },
        "edit",
      ).outcome,
    ).toBe("allowed");

    // Space B: no seat, so an org page stays read-only for SALES.
    const inB = await resolveSpaceRole(actor, 2);
    expect(inB).toBeNull();
    expect(
      decidePageAccess(
        {
          actor,
          page: page(2),
          isKbAdmin: false,
          canEditOrgWide: false,
          spaceRole: inB,
          projectRole: null,
          grantAccess: null,
        },
        "edit",
      ).outcome,
    ).toBe("denied");
  });
});

describe("ensurePrivateSpace", () => {
  it("returns the existing space without inserting", async () => {
    findSpace.mockResolvedValueOnce({ id: 7 });
    await expect(ensurePrivateSpace(actor)).resolves.toEqual({ id: 7, created: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("creates one on first visit, with the actor as its admin", async () => {
    findSpace.mockResolvedValueOnce(undefined);
    await expect(ensurePrivateSpace(actor)).resolves.toEqual({ id: 99, created: true });

    const [space, member] = insertValues.mock.calls.map((call) => call[0]);
    expect(space).toMatchObject({
      orgId: "org-a",
      slug: privateSpaceSlug("u1"),
      type: "private",
      defaultVisibility: "private",
      createdById: "u1",
    });
    expect(member).toMatchObject({ spaceId: 99, userId: "u1", spaceRole: "admin" });
  });

  it("reads the winner's row when two first visits race", async () => {
    findSpace.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 12 });
    insertValues.mockReturnValueOnce([]);
    await expect(ensurePrivateSpace(actor)).resolves.toEqual({ id: 12, created: false });
  });
});
