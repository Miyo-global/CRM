import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvRecords } from "./parse-csv";

describe("parseCsv", () => {
  it("reads quoted fields, escaped quotes and embedded separators", () => {
    const csv = 'Title,Note\n"Qa, Alpha","said ""hello"""\nplain,value\n';
    expect(parseCsv(csv)).toEqual([
      ["Title", "Note"],
      ["Qa, Alpha", 'said "hello"'],
      ["plain", "value"],
    ]);
  });

  it("keeps newlines inside quotes and accepts CRLF between rows", () => {
    const csv = 'Title,Note\r\n"two\nlines",ok\r\n';
    expect(parseCsv(csv)).toEqual([
      ["Title", "Note"],
      ["two\nlines", "ok"],
    ]);
  });

  it("keeps empty cells rather than shifting the row", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("parseCsvRecords", () => {
  it("keys rows by a normalised header", () => {
    const { headers, records } = parseCsvRecords('Title,Due Date\nShip it, 2026-01-31 \n');
    expect(headers).toEqual(["title", "due date"]);
    expect(records).toEqual([{ title: "Ship it", "due date": "2026-01-31" }]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsvRecords("")).toEqual({ headers: [], records: [] });
  });
});
