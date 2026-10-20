/** People with no department, or a department id that no longer exists. */
export const NO_DEPARTMENT = "No department";

/** Case- and space-insensitive key, so "QA Dept" and "qa  dept " are one. */
export function departmentKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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
