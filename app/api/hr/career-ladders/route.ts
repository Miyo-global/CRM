import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { careerLadders } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createCareerLadderSchema } from "@/lib/validations/career-ladder";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const trackType = searchParams.get("trackType");

    const conditions = [eq(careerLadders.orgId, session.orgId)];

    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isAdmin) {
      conditions.push(eq(careerLadders.status, "active"));
      conditions.push(eq(careerLadders.visibility, "all"));
    } else {
      if (status) conditions.push(eq(careerLadders.status, status));
      if (trackType) conditions.push(eq(careerLadders.trackType, trackType));
    }

    const data = await db
      .select()
      .from(careerLadders)
      .where(and(...conditions))
      .orderBy(desc(careerLadders.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createCareerLadderSchema);

    const [record] = await db
      .insert(careerLadders)
      .values({
        orgId: session.orgId,
        title: body.title,
        department: body.department ?? null,
        description: body.description ?? null,
        status: body.status ?? "active",
        trackType: body.trackType ?? null,
        visibility: body.visibility ?? "all",
        levels: body.levels,
      })
      .returning();

    return ok(record, 201);
  });
}
