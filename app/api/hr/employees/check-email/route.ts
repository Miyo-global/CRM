import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const email = req.nextUrl.searchParams.get("email");
    if (!email || !z.string().email().safeParse(email).success) {
      return err("Invalid email", 400);
    }
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(users.email, email.toLowerCase()),
          eq(organizationMembers.orgId, session.orgId),
        ),
      )
      .limit(1);
    return ok({ exists: existing.length > 0 });
  });
}
