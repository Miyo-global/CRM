import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmEmailTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(crmEmailTemplates)
      .where(eq(crmEmailTemplates.orgId, session.orgId))
      .orderBy(desc(crmEmailTemplates.createdAt))
      .limit(100);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createSchema);
    const [template] = await db
      .insert(crmEmailTemplates)
      .values({
        orgId: session.orgId,
        name: input.name,
        subject: input.subject,
        body: input.body,
        createdBy: session.user.id,
      })
      .returning();
    return ok(template, 201);
  });
}
