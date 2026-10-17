/** MIYO-0633: the careers-site URL for a job. Pure, so it can be tested. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** The first free variant: "backend-engineer", then "-2", "-3" … */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || "job";
  const used = new Set(taken);
  if (!used.has(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}
