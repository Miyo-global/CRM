import { eq } from "drizzle-orm";
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
