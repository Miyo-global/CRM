import { describe, expect, it } from "vitest";

import { kbConflict, kbDenied, kbNotConfigured, kbNotFound } from "./errors";

describe("kb error helpers", () => {
  it("answers 404 without saying why", async () => {
    const res = kbNotFound();
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });

  it("answers 403 for a visible page the actor cannot act on", async () => {
    const res = kbDenied();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("answers 409 with the revision the client should reload", async () => {
    const res = kbConflict(7);
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: "KB_PAGE_CONFLICT",
      currentRevision: 7,
    });
  });

  it("answers 503 with a code per unconfigured feature", async () => {
    const ai = kbNotConfigured("ai");
    expect(ai.status).toBe(503);
    await expect(ai.json()).resolves.toEqual({
      error: "AI is not configured",
      code: "KB_AI_NOT_CONFIGURED",
    });

    const storage = kbNotConfigured("storage");
    expect(storage.status).toBe(503);
    await expect(storage.json()).resolves.toMatchObject({ code: "KB_STORAGE_NOT_CONFIGURED" });
  });
});
