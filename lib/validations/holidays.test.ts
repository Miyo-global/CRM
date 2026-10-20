import { describe, expect, it } from "vitest";
import { createHolidaySchema } from "./holidays";

describe("createHolidaySchema (QA-BUG-18)", () => {
  it("keeps what was typed, trimmed", () => {
    const name = `QA-TEST <b>bold</b> ' " & é 😀`;
    const parsed = createHolidaySchema.parse({ name: `  ${name} `, date: "2026-12-18" });
    expect(parsed.name).toBe(name);
  });

  it("still rejects symbols-only names", () => {
    expect(createHolidaySchema.safeParse({ name: "<>", date: "2026-12-18" }).success).toBe(false);
  });
});
