

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabels } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createLabelSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color").optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const labels = await db.query.ticketLabels.findMany({
      where: eq(ticketLabels.orgId, session.orgId!),
      orderBy: [desc(ticketLabels.createdAt)],
    });
    return ok(labels);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createLabelSchema);

    const [label] = await db
      .insert(ticketLabels)
      .values({
        orgId: session.orgId!,
        name: body.name,
        color: body.color ?? "#3B82F6",
      })
      .returning();

    return ok(label, 201);
  });
}
