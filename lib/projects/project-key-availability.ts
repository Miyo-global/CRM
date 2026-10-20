import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { keyWithSuffix, suggestProjectKey } from "@/lib/projects/project-key";

export async function isProjectKeyTaken(key: string): Promise<boolean> {
  const row = await db.query.projects.findFirst({ where: eq(projects.key, key), columns: { id: true } });
  return !!row;
}

export async function firstFreeProjectKey(name: string): Promise<string | null> {
  const base = suggestProjectKey(name);
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : keyWithSuffix(base, n);
    if (!(await isProjectKeyTaken(candidate))) return candidate;
  }
  return null;
}

/** Project names are unique per org, ignoring case (BUG-23). Deleted projects do not count. */
export async function isProjectNameTaken(orgId: string, name: string, exceptId?: number): Promise<boolean> {
  const row = await db.query.projects.findFirst({
    where: and(
      eq(projects.orgId, orgId),
      sql`lower(trim(${projects.name})) = ${name.trim().toLowerCase()}`,
      isNull(projects.deletedAt),
      exceptId !== undefined ? ne(projects.id, exceptId) : undefined,
    ),
    columns: { id: true },
  });
  return !!row;
}

export { DUPLICATE_PROJECT_NAME } from "@/lib/projects/project-name";
