import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn();
const warn = vi.fn();

vi.mock("@/lib/db", () => ({ db: { insert: () => ({ values: (...a: unknown[]) => values(...a) }) } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: (...a: unknown[]) => warn(...a), info: () => {}, error: () => {} } }));

const { logKbEvent } = await import("./events");

beforeEach(() => {
  values.mockReset();
  warn.mockReset();
  values.mockResolvedValue(undefined);
});

describe("logKbEvent", () => {
  it("writes the event", async () => {
    await logKbEvent("org-a", "search", { actorId: "u1", query: "leave policy" });
    expect(values).toHaveBeenCalledWith({
      orgId: "org-a",
      eventType: "search",
      actorId: "u1",
      pageId: null,
      query: "leave policy",
      metadata: null,
      correlationId: null,
    });
  });

  it("truncates a very long query", async () => {
    await logKbEvent("org-a", "search", { query: "x".repeat(500) });
    expect(values.mock.calls[0][0].query).toHaveLength(200);
  });

  it("logs and swallows a database failure, so the caller is unaffected", async () => {
    values.mockRejectedValueOnce(new Error("relation does not exist"));
    await expect(logKbEvent("org-a", "view", { pageId: 5 })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("kb.event.write_failed", expect.objectContaining({ type: "view" }));
  });
});
