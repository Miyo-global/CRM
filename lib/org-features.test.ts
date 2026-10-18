import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({ organizations: {} }));

const { parseOrgFeatureFlags } = await import("./org-features");

describe("parseOrgFeatureFlags", () => {
  it("defaults the knowledge flags: module, AI and sharing on, help centre off", () => {
    expect(parseOrgFeatureFlags({})).toMatchObject({
      knowledgeBase: true,
      knowledgeAi: true,
      knowledgePublicSharing: true,
      knowledgeHelpCentre: false,
    });
  });

  it("keeps a stored false", () => {
    const flags = parseOrgFeatureFlags({ features: { knowledgeBase: false, knowledgeHelpCentre: true } });
    expect(flags.knowledgeBase).toBe(false);
    expect(flags.knowledgeHelpCentre).toBe(true);
    expect(flags.knowledgeAi).toBe(true);
  });
});
