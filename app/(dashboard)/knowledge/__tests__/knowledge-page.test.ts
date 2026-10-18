import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { to });
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/knowledge/config", () => ({
  getKbCapabilities: vi.fn(),
}));

vi.mock("@/lib/org-features", () => ({
  getOrgFeatureFlags: vi.fn(),
}));

import { requireAuth } from "@/lib/auth/require-auth";
import { getKbCapabilities } from "@/lib/knowledge/config";
import { getOrgFeatureFlags } from "@/lib/org-features";

import KnowledgePage from "../page";

const capabilities = {
  ai: false,
  embeddings: false,
  storage: false,
  jobs: false,
  email: false,
  vector: false,
  helpCentre: false,
};

async function redirectTarget(): Promise<string> {
  try {
    await KnowledgePage();
  } catch (error) {
    return (error as { to?: string }).to ?? (error as Error).message;
  }
  throw new Error("the page returned instead of redirecting");
}

describe("KB-0067: /knowledge", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      orgId: "org_1",
      userId: "user_1",
    } as Awaited<ReturnType<typeof requireAuth>>);
  });

  it("opens Ask when there is an AI key and the org wants it", async () => {
    vi.mocked(getKbCapabilities).mockResolvedValue({ ...capabilities, ai: true });
    vi.mocked(getOrgFeatureFlags).mockResolvedValue({ knowledgeAi: true } as Awaited<
      ReturnType<typeof getOrgFeatureFlags>
    >);

    expect(await redirectTarget()).toBe("/knowledge/chat");
  });

  it("opens the wiki with no AI key, rather than an Ask page that cannot answer", async () => {
    vi.mocked(getKbCapabilities).mockResolvedValue(capabilities);
    vi.mocked(getOrgFeatureFlags).mockResolvedValue({ knowledgeAi: true } as Awaited<
      ReturnType<typeof getOrgFeatureFlags>
    >);

    expect(await redirectTarget()).toBe("/knowledge/wiki");
  });

  it("opens the wiki when the org has switched KB AI off, key or not", async () => {
    vi.mocked(getKbCapabilities).mockResolvedValue({ ...capabilities, ai: true });
    vi.mocked(getOrgFeatureFlags).mockResolvedValue({ knowledgeAi: false } as Awaited<
      ReturnType<typeof getOrgFeatureFlags>
    >);

    expect(await redirectTarget()).toBe("/knowledge/wiki");
  });

  it("404s an unauthenticated visitor", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: "Unauthorized" });

    expect(await redirectTarget()).toBe("NEXT_NOT_FOUND");
  });
});
