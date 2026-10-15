import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn();
const logError = vi.fn();

vi.mock("@/lib/db", () => ({ db: { insert: () => ({ values }) } }));
vi.mock("@/lib/logger", () => ({ logger: { error: (...args: unknown[]) => logError(...args) } }));

import { diffTicketActivity, recordTicketActivity } from "./record-ticket-activity";

describe("diffTicketActivity", () => {
  it("records only fields that changed after normalizing", () => {
    const entries = diffTicketActivity(
      { title: "Fix", status: "TODO", priority: "LOW", points: 3 },
      { title: " Fix ", status: "DONE", priority: "LOW", points: "3" },
    );
    expect(entries).toEqual([{ action: "status_changed", field: "status", fromValue: "TODO", toValue: "DONE" }]);
  });

  it("ignores fields missing from the update", () => {
    expect(diffTicketActivity({ status: "TODO" }, {})).toEqual([]);
  });

  it("treats empty strings as null", () => {
    expect(diffTicketActivity({ dueDate: null }, { dueDate: "" })).toEqual([]);
  });

  it("never records the description", () => {
    const before = { description: "a" } as Record<string, unknown>;
    const after = { description: "b" } as Record<string, unknown>;
    expect(diffTicketActivity(before, after)).toEqual([]);
  });

  it("uses labels for display values", () => {
    const names: Record<string, string> = { u1: "Asha", u2: "Ravi" };
    const entries = diffTicketActivity({ assigneeId: "u1" }, { assigneeId: "u2" }, (_field, v) => names[v]);
    expect(entries).toEqual([{ action: "assignee_changed", field: "assigneeId", fromValue: "Asha", toValue: "Ravi" }]);
  });

  it("falls back to the raw value when no label exists", () => {
    const entries = diffTicketActivity({ cycleId: null }, { cycleId: 9 }, () => undefined);
    expect(entries[0]).toMatchObject({ action: "cycle_changed", fromValue: null, toValue: "9" });
  });

  it("formats dates as YYYY-MM-DD", () => {
    const entries = diffTicketActivity({ dueDate: "2026-10-01" }, { dueDate: new Date("2026-10-20T00:00:00Z") });
    expect(entries[0]).toMatchObject({ fromValue: "2026-10-01", toValue: "2026-10-20" });
  });

  it("truncates long values", () => {
    const entries = diffTicketActivity({ title: "a" }, { title: "x".repeat(500) });
    expect(entries[0].toValue).toHaveLength(200);
  });

  it("distinguishes parent set and removed", () => {
    expect(diffTicketActivity({ parentTicketId: null }, { parentTicketId: 4 })[0].action).toBe("parent_set");
    expect(diffTicketActivity({ parentTicketId: 4 }, { parentTicketId: null })[0].action).toBe("parent_removed");
  });
});

describe("recordTicketActivity", () => {
  const ctx = { orgId: "org", projectId: 1, ticketId: 2, actorId: "u1" };
  const entry = { action: "status_changed" as const, field: "status", fromValue: "TODO", toValue: "DONE" };

  beforeEach(() => {
    values.mockReset();
    logError.mockReset();
  });

  it("skips the insert when nothing changed", async () => {
    await recordTicketActivity(ctx, []);
    expect(values).not.toHaveBeenCalled();
  });

  it("inserts rows scoped to the ticket context", async () => {
    values.mockResolvedValue(undefined);
    await recordTicketActivity(ctx, [entry]);
    expect(values).toHaveBeenCalledWith([{ ...ctx, ...entry }]);
  });

  it("logs and swallows insert failures", async () => {
    values.mockRejectedValue(new Error("db down"));
    await expect(recordTicketActivity(ctx, [entry])).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledOnce();
  });
});
