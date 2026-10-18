import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst: Record<string, unknown> = {};
const sent: Array<Record<string, unknown>> = [];
const access = vi.fn();
const errors: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    query: new Proxy(
      {},
      { get: (_t, table: string) => ({ findFirst: async () => findFirst[table] }) },
    ),
  },
}));

vi.mock("@/lib/notifications/send", () => ({
  sendNotification: async (payload: Record<string, unknown>) => {
    sent.push(payload);
    return true;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: (...a: unknown[]) => errors.push(a), warn: () => {}, info: () => {} },
}));

vi.mock("./authorization", () => ({ resolvePageAccess: (...a: unknown[]) => access(...a) }));
vi.mock("./actor", () => ({ resolveKbPermissions: async () => [] }));

const { deliverMentions } = await import("./mentions");

beforeEach(() => {
  for (const key of Object.keys(findFirst)) delete findFirst[key];
  sent.length = 0;
  errors.length = 0;
  access.mockReset();
  findFirst.kbPages = { id: 5, title: "Leave policy" };
  findFirst.organizationMembers = { role: "ENGINEERING" };
  findFirst.users = { email: "a@example.test" };
  access.mockResolvedValue({ outcome: "allowed", scope: { action: "view" } });
});

describe("deliverMentions", () => {
  it("notifies a mentioned colleague who can view the page", async () => {
    const result = await deliverMentions("org-a", 5, "u1", ["u2"]);
    expect(result.notified).toEqual(["u2"]);
    expect(sent[0]).toMatchObject({
      userId: "u2",
      link: "/knowledge/wiki/doc/5",
      channel: "both",
      recipientEmail: "a@example.test",
    });
    expect(String(sent[0].message)).toContain("Leave policy");
  });

  it("does not notify someone who cannot view the page", async () => {
    access.mockResolvedValue({ outcome: "notFound" });
    const result = await deliverMentions("org-a", 5, "u1", ["u2"]);
    expect(result).toMatchObject({ notified: [], skipped: [{ userId: "u2", reason: "no_access" }] });
    expect(sent).toHaveLength(0);
  });

  it("does not notify the mentioner or someone outside the org", async () => {
    const self = await deliverMentions("org-a", 5, "u1", ["u1"]);
    expect(self.skipped).toEqual([{ userId: "u1", reason: "self" }]);

    findFirst.organizationMembers = undefined;
    const outsider = await deliverMentions("org-a", 5, "u1", ["u9"]);
    expect(outsider.skipped).toEqual([{ userId: "u9", reason: "not_in_org" }]);
    expect(sent).toHaveLength(0);
  });

  it("deduplicates and does nothing for an empty list", async () => {
    await deliverMentions("org-a", 5, "u1", ["u2", "u2"]);
    expect(sent).toHaveLength(1);

    sent.length = 0;
    await deliverMentions("org-a", 5, "u1", []);
    expect(sent).toHaveLength(0);
  });

  it("swallows and logs a failure, so a save is never lost to the mailer", async () => {
    access.mockRejectedValueOnce(new Error("db down"));
    await expect(deliverMentions("org-a", 5, "u1", ["u2"])).resolves.toMatchObject({
      notified: [],
    });
    expect(errors).toHaveLength(1);
  });
});
