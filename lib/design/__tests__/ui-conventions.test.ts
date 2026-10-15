import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The design conventions from the redesign brief, as a test so CI fails on a
 * regression instead of a reviewer catching it (B2, B3, B4).
 */
const ROOTS = ["app", "components", "features"];
const EXTENSIONS = new Set([".ts", ".tsx"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return EXTENSIONS.has(path.extname(name)) ? [full] : [];
  });
}

const files = ROOTS.flatMap(sourceFiles).filter(
  (f) => !f.includes(path.join("lib", "design", "__tests__")),
);

function offenders(pattern: RegExp): string[] {
  return files.filter((f) => pattern.test(readFileSync(f, "utf8")));
}

describe("UI conventions", () => {
  it("uses the shadcn Select, never a native <select>", () => {
    expect(offenders(/<select[\s>]/)).toEqual([]);
  });

  it("has no gradient backgrounds", () => {
    expect(offenders(/bg-gradient/)).toEqual([]);
  });

  it("has no illustrated empty states", () => {
    expect(offenders(/components\/illustrations|[A-Za-z]+Illustration\b/)).toEqual([]);
  });

  it("uses the rupee, never a dollar icon", () => {
    expect(offenders(/\bDollarSign\b/)).toEqual([]);
  });
});
