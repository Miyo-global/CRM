import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const insertValues = vi.fn();
const updates: Array<Record<string, unknown>> = [];

vi.mock("@/lib/db", () => ({
  db: {
    query: { kbSettings: { findFirst: (...a: unknown[]) => findFirst(...a) } },
    insert: () => ({
      values: (rows: unknown) => {
        insertValues(rows);
        return { onConflictDoNothing: () => ({ returning: async () => insertValues.mock.results.at(-1)?.value ?? [] }) };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  },
}));

const { applyHrFlagNesting, getKbSettings, KB_SETTINGS_DEFAULTS, updateKbSettings } =
  await import("./settings");

beforeEach(() => {
  findFirst.mockReset();
  insertValues.mockReset();
  updates.length = 0;
  insertValues.mockReturnValue([KB_SETTINGS_DEFAULTS]);
});

describe("getKbSettings", () => {
  it("returns the stored row", async () => {
    findFirst.mockResolvedValueOnce({ ...KB_SETTINGS_DEFAULTS, trashRetentionDays: 7 });
    await expect(getKbSettings("org-a")).resolves.toMatchObject({ trashRetentionDays: 7 });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("creates the default row on first read", async () => {
    findFirst.mockResolvedValueOnce(undefined);
    await expect(getKbSettings("org-a")).resolves.toEqual(KB_SETTINGS_DEFAULTS);
    expect(insertValues).toHaveBeenCalledWith({ orgId: "org-a" });
  });

  it("falls back to the defaults when another first read won the race", async () => {
    findFirst.mockResolvedValueOnce(undefined);
    insertValues.mockReturnValueOnce([]);
    await expect(getKbSettings("org-a")).resolves.toEqual(KB_SETTINGS_DEFAULTS);
  });
});

describe("applyHrFlagNesting", () => {
  it("takes search and AI down with the link", () => {
    const next = applyHrFlagNesting(
      {
        ...KB_SETTINGS_DEFAULTS,
        hrmsKbLinkEnabled: true,
        hrmsKbSearchEnabled: true,
        hrmsKbAiEnabled: true,
      },
      { hrmsKbLinkEnabled: false },
    );
    expect(next).toMatchObject({
      hrmsKbLinkEnabled: false,
      hrmsKbSearchEnabled: false,
      hrmsKbAiEnabled: false,
    });
  });

  it("takes AI down with search", () => {
    const next = applyHrFlagNesting(
      { ...KB_SETTINGS_DEFAULTS, hrmsKbLinkEnabled: true, hrmsKbSearchEnabled: true, hrmsKbAiEnabled: true },
      { hrmsKbSearchEnabled: false },
    );
    expect(next.hrmsKbAiEnabled).toBe(false);
  });

  it("refuses to imply the parents when AI is turned on alone", () => {
    const next = applyHrFlagNesting(KB_SETTINGS_DEFAULTS, { hrmsKbAiEnabled: true });
    expect(next.hrmsKbAiEnabled).toBe(false);
  });
});

describe("updateKbSettings", () => {
  it("writes the nested result, not the raw patch", async () => {
    findFirst.mockResolvedValueOnce({
      ...KB_SETTINGS_DEFAULTS,
      hrmsKbLinkEnabled: true,
      hrmsKbSearchEnabled: true,
    });
    await updateKbSettings("org-a", { hrmsKbLinkEnabled: false });
    expect(updates[0]).toMatchObject({
      hrmsKbLinkEnabled: false,
      hrmsKbSearchEnabled: false,
      hrmsKbAiEnabled: false,
    });
  });
});
