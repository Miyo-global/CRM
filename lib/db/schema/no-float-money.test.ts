import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// Money is numeric/decimal, never a float (V5-ARCH-011). Ordering columns are
// the only floats allowed.
describe("schema", () => {
  it("has no float columns except sort orders", () => {
    const hits = execSync("grep -rnE 'real\\(|doublePrecision\\(' lib/db/schema || true", { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.includes("sort_order"));
    expect(hits).toEqual([]);
  });
});
