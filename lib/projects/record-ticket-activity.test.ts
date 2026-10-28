import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn();
const logError = vi.fn();
const findUsers = vi.fn();
const findSprints = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values }),
    query: {
      users: { findMany: (...args: unknown[]) => findUsers(...args) },
      sprints: { findMany: (...args: unknown[]) => findSprints(...args) },
      cycles: { findMany: async () => [] },
    },
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: (...args: unknown[]) => logError(...args) } }));
const audit = vi.fn(async () => {});
vi.mock("@/lib/audit-log", () => ({ createAuditLog: (...args: unknown[]) => audit(...(args as [])) }));

import { diffTicketActivity, recordTicketActivity, ticketAuditAction } from "./record-ticket-activity";

describe("ticketAuditAction", () => {
  const e = (action: string) => ({ action, field: null, fromValue: null, toValue: null }) as never;
  it("maps activity batches to one audit action", () => {
    expect(ticketAuditAction([e("created")])).toBe("ticket.created");
    expect(ticketAuditAction([e("priority_changed"), e("status_changed")])).toBe("ticket.status_changed");
    expect(ticketAuditAction([e("title_changed")])).toBe("ticket.updated");
    expect(ticketAuditAction([e("archived")])).toBe("ticket.archived");
    expect(ticketAuditAction([e("comment_added")])).toBeNull();
  });
});

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
    findUsers.mockReset();
    findSprints.mockReset();
  });

  it("stores display names instead of ids", async () => {
    values.mockResolvedValue(undefined);
    findUsers.mockResolvedValue([
      { id: "u1", name: "Asha", firstName: null, lastName: null, email: "a@x.io" },
      { id: "u2", name: null, firstName: "Ravi", lastName: "K", email: "r@x.io" },
    ]);
    findSprints.mockResolvedValue([{ id: 5, name: "Sprint 5" }]);
    await recordTicketActivity(ctx, [
      { action: "assignee_changed", field: "assigneeId", fromValue: "u1", toValue: "u2" },
      { action: "sprint_changed", field: "sprintId", fromValue: null, toValue: "5" },
      { action: "cycle_changed", field: "cycleId", fromValue: null, toValue: "9" },
    ]);
    expect(values).toHaveBeenCalledWith([
      expect.objectContaining({ fromValue: "Asha", toValue: "Ravi K" }),
      expect.objectContaining({ fromValue: null, toValue: "Sprint 5" }),
      expect.objectContaining({ fromValue: null, toValue: "9" }),
    ]);
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
