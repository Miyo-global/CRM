/**
 * Reports modules that nothing can reach.
 *
 * Builds the real import graph — resolving the "@/" alias, relative paths,
 * directory index files and `export ... from` re-exports — then walks it from
 * every entry point the framework or tooling loads on its own. Anything left
 * over is unreachable and safe to delete.
 *
 *   node scripts/find-dead-code.mjs          # report, exit 0
 *   node scripts/find-dead-code.mjs --check  # exit 1 if anything is unreachable (CI)
 *
 * Entry points are, by definition, never "unreferenced": Next.js convention
 * files (page/layout/route/…), middleware, instrumentation, Sentry configs,
 * tests, scripts, drizzle migrations and *.config.*. Ambient declarations
 * (*.d.ts) are excluded too — tsconfig loads them without an import.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const files = execSync(
  `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" \\) ` +
    `-not -path "./node_modules/*" -not -path "./.next/*" ` +
    `-not -path "./graphify-out/*" -not -path "./drizzle/*"`,
  { encoding: "utf8", maxBuffer: 1 << 28 },
).trim().split("\n").map((f) => path.resolve(f));

const known = new Set(files);
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", ".mjs", "/index.ts", "/index.tsx"];

function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier
  for (const suffix of CANDIDATE_SUFFIXES) {
    if (known.has(base + suffix)) return base + suffix;
  }
  return null;
}

// import x from "m" | export * from "m" | import("m") | require("m") | import "m"
const SPECIFIER_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']|\bimport\s+["']([^"']+)["']/g;

const imports = new Map();
for (const file of files) {
  const src = readFileSync(file, "utf8");
  const targets = new Set();
  for (const match of src.matchAll(SPECIFIER_RE)) {
    const resolved = resolveSpecifier(match[1] ?? match[2], file);
    if (resolved) targets.add(resolved);
  }
  imports.set(file, targets);
}

function isEntryPoint(file) {
  const rel = path.relative(ROOT, file);
  const name = path.basename(file);
  return (
    /^(page|layout|route|template|loading|error|global-error|not-found|default|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(ts|tsx)$/.test(name) ||
    /^(middleware|instrumentation)\.ts$/.test(rel) ||
    /^sentry\..*\.ts$/.test(name) ||
    /\.(test|spec)\.(ts|tsx)$/.test(name) ||
    /\.config\.(ts|mjs)$/.test(name) ||
    /\.d\.ts$/.test(name) ||
    /^(scripts|drizzle)\//.test(rel)
  );
}

const reachable = new Set();
const queue = files.filter(isEntryPoint);
while (queue.length) {
  const file = queue.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  for (const next of imports.get(file) ?? []) {
    if (!reachable.has(next)) queue.push(next);
  }
}

const dead = files
  .filter((f) => !reachable.has(f))
  .map((f) => path.relative(ROOT, f))
  .sort();

console.log(`modules: ${files.length}   reachable: ${reachable.size}   unreachable: ${dead.length}`);
if (dead.length) {
  console.log("");
  for (const file of dead) console.log(`  ${file}`);
  console.log(`\n${dead.length} unreachable module(s). Delete them, or import them from something reachable.`);
}
process.exit(CHECK && dead.length ? 1 : 0);
