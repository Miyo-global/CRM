/** People with no department, or a department id that no longer exists. */
export const NO_DEPARTMENT = "No department";

/** Case- and space-insensitive key, so "QA Dept" and "qa  dept " are one. */
export function departmentKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Department names for a filter, one per {@link departmentKey}, sorted. Race
 * tests left the same name six times in one org, and the Employees filter
 * listed every copy (QA-BUG-26). The filter matches by name, so one entry
 * still finds people in every copy.
 */
export function uniqueDepartmentNames(rows: Iterable<{ name: string }>): string[] {
  const byKey = new Map<string, string>();
  for (const { name } of rows) {
    const key = departmentKey(name);
    if (key && !byKey.has(key)) byKey.set(key, name.trim());
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * How many departments the org has, counted one way everywhere (QA-BUG-14):
 * distinct names among the given active people, without "No department".
 * The org chart counted "No department" as one and Analytics split it into
 * "Other" and "Unassigned", so they read 9 and 10.
 */
export function countDepartments(names: Iterable<string | null | undefined>): number {
  const keys = new Set<string>();
  for (const name of names) {
    if (!name || name === NO_DEPARTMENT) continue;
    const key = departmentKey(name);
    if (key) keys.add(key);
  }
  return keys.size;
}
