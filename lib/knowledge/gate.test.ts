import { describe, expect, it, vi } from "vitest";

const getOrgFeatureFlags = vi.fn();

vi.mock("@/lib/org-features", () => ({
  getOrgFeatureFlags: (...args: unknown[]) => getOrgFeatureFlags(...args),
}));

const { knowledgeAiEnabled, requireKnowledgeBase } = await import("./gate");

describe("requireKnowledgeBase", () => {
  it("lets the request through when the module is on", async () => {
    getOrgFeatureFlags.mockResolvedValueOnce({ knowledgeBase: true });
    await expect(requireKnowledgeBase("org-a")).resolves.toBeNull();
  });

  it("answers 404, not 403, when the module is off", async () => {
    getOrgFeatureFlags.mockResolvedValueOnce({ knowledgeBase: false });
    const res = await requireKnowledgeBase("org-a");
    expect(res?.status).toBe(404);
  });
});

describe("knowledgeAiEnabled", () => {
  it("needs the org flag and a configured key", () => {
    expect(knowledgeAiEnabled({ knowledgeAi: true }, { ai: true })).toBe(true);
    expect(knowledgeAiEnabled({ knowledgeAi: true }, { ai: false })).toBe(false);
    expect(knowledgeAiEnabled({ knowledgeAi: false }, { ai: true })).toBe(false);
  });
});
