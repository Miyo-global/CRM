import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("@/lib/db", () => ({ db: { execute: (...args: unknown[]) => execute(...args) } }));
vi.mock("@/lib/org-features", () => ({
  getOrgFeatureFlags: vi.fn(async () => ({ knowledgeHelpCentre: false })),
}));

import { getKbCapabilities, hasKbVectorStore } from "./config";

const OPTIONAL_VARS = [
  "OPENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "ZEPTOMAIL_API_TOKEN",
  "ZEPTOMAIL_TOKEN",
  "ZEPTOMAIL_API_KEY",
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  execute.mockReset();
  for (const name of OPTIONAL_VARS) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of OPTIONAL_VARS) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe("getKbCapabilities", () => {
  it("reports every capability off when nothing is configured", async () => {
    execute.mockResolvedValue([{ present: false }]);
    await expect(getKbCapabilities("org-a")).resolves.toEqual({
      ai: false,
      embeddings: false,
      storage: false,
      email: false,
      vector: false,
      helpCentre: false,
    });
  });

  it("returns booleans only, so no env value can leak into the response", async () => {
    process.env.OPENAI_API_KEY = "sk-secret-value";
    process.env.ZEPTOMAIL_API_TOKEN = "zepto-secret-value";
    execute.mockResolvedValue([{ present: true }]);

    const capabilities = await getKbCapabilities("org-a");

    expect(capabilities).toEqual({
      ai: true,
      embeddings: true,
      storage: false,
      email: true,
      vector: true,
      helpCentre: false,
    });
    expect(Object.values(capabilities).every((value) => typeof value === "boolean")).toBe(true);
    const body = JSON.stringify(capabilities);
    for (const secret of ["sk-secret-value", "zepto-secret-value"]) {
      expect(body).not.toContain(secret);
    }
  });

  it("treats an org lookup failure as help centre off", async () => {
    execute.mockResolvedValue([{ present: false }]);
    const { getOrgFeatureFlags } = await import("@/lib/org-features");
    vi.mocked(getOrgFeatureFlags).mockRejectedValueOnce(new Error("db down"));
    await expect(getKbCapabilities("org-a")).resolves.toMatchObject({ helpCentre: false });
  });
});

describe("hasKbVectorStore", () => {
  it("is false, not a throw, when the probe fails", async () => {
    execute.mockRejectedValue(new Error("relation does not exist"));
    await expect(hasKbVectorStore()).resolves.toBe(false);
  });

  it("reads the rows shape the pg driver returns", async () => {
    execute.mockResolvedValue({ rows: [{ present: true }] });
    await expect(hasKbVectorStore()).resolves.toBe(true);
  });
});
