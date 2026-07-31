import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { isSafePublicHttpsUrl } from "@/lib/security/ssrf";

const webhookEventSchema = z.enum([
  "*",
  "lead.created",
  "lead.status_changed",
  "lead.assigned",
  "lead.converted",
  "deal.created",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "resignation.submitted",
  "resignation.approved",
  "termination.submitted",
  "termination.approved",
  "invoice.created",
  "invoice.paid",
  "employee.onboarded",
]);

const createSchema = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .startsWith("https://")
    .refine(isSafePublicHttpsUrl, {
      message: "URL must be a public HTTPS endpoint; private, internal, or loopback addresses are not allowed.",
    }),
  description: z.string().optional(),
  events: z.array(webhookEventSchema).default([]),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const endpoints = await db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.orgId, session.orgId),
      orderBy: [desc(webhookEndpoints.createdAt)],
    });

    const safe = endpoints.map((ep) => {
      const { secret: _secret, ...rest } = ep;
      return rest;
    });
    return ok(safe);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createSchema);
    const secret = randomBytes(32).toString("hex");
    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        orgId: session.orgId,
        url: body.url,
        secret,
        description: body.description,
        events: body.events,
        createdBy: session.user.id,
      })
      .returning();

    return ok(endpoint, 201);
  });
}
