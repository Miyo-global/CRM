import { describe, expect, it } from "vitest";
import { projectCreateSchema } from "./project-create-schema";

const base = {
  name: "Website",
  key: "web",
  priority: "NONE" as const,
  memberIds: [],
  templateId: "none",
  modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
};

describe("projectCreateSchema", () => {
  it("uppercases the key", () => {
    expect(projectCreateSchema.parse(base).key).toBe("WEB");
  });

  it("rejects keys with symbols or a leading digit", () => {
    expect(projectCreateSchema.safeParse({ ...base, key: "WE-B" }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ ...base, key: "1WEB" }).success).toBe(false);
  });

  it("rejects a due date before the start date", () => {
    const result = projectCreateSchema.safeParse({ ...base, startDate: "2026-10-10", endDate: "2026-10-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["endDate"]);
  });

  it("rejects a one-letter name", () => {
    expect(projectCreateSchema.safeParse({ ...base, name: "W" }).success).toBe(false);
  });
});
