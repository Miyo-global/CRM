import { describe, expect, it } from "vitest";
import { sheetToCsv, withExtension } from "./xlsx-utils";

describe("CSV export (QA-D002)", () => {
  it("quotes separators, newlines and quotes", () => {
    const csv = sheetToCsv({
      name: "People",
      columns: [
        { header: "Name", key: "name" },
        { header: "Note", key: "note" },
      ],
      rows: [
        { name: "Qa, Alpha", note: 'said "hello"' },
        { name: "Qa Beta", note: "line one\nline two" },
      ],
    });

    expect(csv.split("\n")[0]).toBe("Name,Note");
    expect(csv).toContain('"Qa, Alpha"');
    expect(csv).toContain('"said ""hello"""');
    expect(csv).toContain('"line one\nline two"');
  });

  it("keeps one base name for both formats", () => {
    expect(withExtension("employees-2026-10-16.xlsx", "csv")).toBe("employees-2026-10-16.csv");
    expect(withExtension("employees-2026-10-16", "xlsx")).toBe("employees-2026-10-16.xlsx");
  });
});
