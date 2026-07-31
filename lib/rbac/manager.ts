import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MAX_DEPTH = 32;

export async function isManagerOf(actorId: string, targetUserId: string): Promise<boolean> {
  if (actorId === targetUserId) return false;
  let currentId: string | null = targetUserId;
  const visited = new Set<string>();
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (!currentId) return false;
    const rows = await db
      .select({ reportingTo: users.reportingTo })
      .from(users)
      .where(eq(users.id, currentId))
      .limit(1);
    const next: string | null = rows[0]?.reportingTo ?? null;
    if (!next) return false;
    if (next === actorId) return true;
    if (visited.has(next)) return false;
    visited.add(next);
    currentId = next;
  }
  return false;
}
