import { describe, expect, it, vi } from "vitest";

/** R2-LC-06: a resent set-up link replaces the old one, and only its hash is stored. */
const calls: string[] = [];
const inserted: Record<string, unknown>[] = [];
const sendWelcomeEmail = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock("@/lib/db", () => {
  const tx = {
    delete: () => ({ where: async () => { calls.push("delete"); } }),
    insert: () => ({
      values: async (v: Record<string, unknown>) => { calls.push("insert"); inserted.push(v); },
    }),
  };
  return {
    db: {
      transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
      query: { users: { findFirst: async () => ({ name: "Asha Manager" }) } },
    },
  };
});
vi.mock("@/lib/db/schema", () => ({ passwordResetTokens: { email: "email" }, users: { id: "id" } }));
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: (...a: unknown[]) => sendWelcomeEmail(...a) }));
vi.mock("@/lib/app-url", () => ({ appUrl: "https://crm.test" }));

import { sendSetupLink } from "./setup-link";

describe("sendSetupLink", () => {
  it("deletes earlier links before storing the hash of a fresh one", async () => {
    await sendSetupLink({ email: "new@miyo.test", name: "New Hire", reportingTo: "m1" });

    expect(calls).toEqual(["delete", "insert"]);
    const url = String(sendWelcomeEmail.mock.calls[0]?.[2]);
    const token = new URL(url).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(inserted[0]?.email).toBe("new@miyo.test");
    expect(inserted[0]?.token).not.toBe(token);
  });
});
