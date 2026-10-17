import { describe, it, expect } from "vitest";

import { mapCsvCandidates, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("keeps a comma inside quotes in one field", () => {
    expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
  });

  it("reads a doubled quote as one quote", () => {
    expect(parseCsv('"she said ""hi"""')).toEqual([['she said "hi"']]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("mapCsvCandidates", () => {
  it("matches the usual header spellings", () => {
    const { candidates } = mapCsvCandidates(
      parseCsv("First Name,Last Name,E-mail,Mobile\nAsha,Rao,ASHA@example.com,98765 43210"),
    );
    expect(candidates).toEqual([
      {
        firstName: "Asha",
        lastName: "Rao",
        email: "asha@example.com",
        phone: "98765 43210",
        linkedinUrl: undefined,
        source: undefined,
      },
    ]);
  });

  it("splits a single name column", () => {
    const { candidates } = mapCsvCandidates(parseCsv("Name,Email\nAsha Rao,asha@example.com"));
    expect(candidates[0]).toMatchObject({ firstName: "Asha", lastName: "Rao" });
  });

  it("says which lines it skipped and why", () => {
    const { candidates, skipped } = mapCsvCandidates(
      parseCsv("Name,Email\nNo Email,\n,nobody@example.com"),
    );
    expect(candidates).toHaveLength(0);
    expect(skipped).toEqual([
      { line: 2, reason: "no email address" },
      { line: 3, reason: "no name" },
    ]);
  });
});
