import { describe, expect, it } from "vitest";
import { buildTablePdf } from "./table-pdf";

describe("buildTablePdf", () => {
  it("produces a real PDF", async () => {
    const pdf = await buildTablePdf({
      title: "Headcount",
      columns: [
        { header: "Employee", width: 150 },
        { header: "Net", width: 80, align: "right" },
      ],
      rows: [["Qa Alpha", "10000.00"], ["A very long employee name that will not fit", "1"]],
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it("still renders with no rows", async () => {
    const pdf = await buildTablePdf({ title: "Empty", columns: [{ header: "A", width: 50 }], rows: [] });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
