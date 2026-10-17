import { describe, it, expect } from "vitest";
import { readTicketCsv } from "./import-tickets";

const header = "Title,Type,Priority,Points,Due Date,Assignee\n";

describe("readTicketCsv", () => {
  it("maps a good row onto a ticket input", () => {
    const { rows } = readTicketCsv(`${header}Fix login,Bug,HIGH,3,2026-02-01,Dev@Example.com\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0].ok).toBe(true);
    expect(rows[0].assigneeEmail).toBe("dev@example.com");
    expect(rows[0].input).toMatchObject({
      title: "Fix login",
      type: "BUG",
      priority: "HIGH",
      points: 3,
      dueDate: "2026-02-01",
    });
  });

  it("defaults the type and accepts FEATURE as STORY", () => {
    const { rows } = readTicketCsv(`${header}No type,,,,,\nA feature,Feature,,,,\n`);
    expect(rows[0].input?.type).toBe("TASK");
    expect(rows[1].input?.type).toBe("STORY");
  });

  it("reports the line and the reason for each bad row", () => {
    const csv =
      `${header}` +
      ",Bug,,,,\n" + // no title
      "Bad date,Task,,,01-02-2026,\n" +
      "Bad points,Task,,two,,\n" +
      "Bad priority,Task,SOON,,,\n";
    const { rows } = readTicketCsv(csv);
    expect(rows.map((r) => [r.line, r.ok])).toEqual([
      [2, false],
      [3, false],
      [4, false],
      [5, false],
    ]);
    expect(rows[0].error).toMatch(/Title/);
    expect(rows[1].error).toMatch(/YYYY-MM-DD/);
    expect(rows[2].error).toMatch(/whole number/);
    expect(rows[3].error).toMatch(/Priority/);
  });

  it("rejects a status the project does not have", () => {
    const { rows } = readTicketCsv(`Title,Status\nShip,In Progress\n`, {
      statuses: ["TODO", "DONE"],
    });
    expect(rows[0].ok).toBe(false);
    expect(rows[0].error).toMatch(/IN_PROGRESS/);
  });
});
