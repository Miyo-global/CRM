import { type NextRequest } from "next/server";
import { withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { randomBytes } from "crypto";
import { isSafePublicHttpsUrl } from "@/lib/security/ssrf";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

const webhookEventSchema = z.enum(["*", ...WEBHOOK_EVENTS]);

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

/** Admin-only: the endpoint list was readable by any employee (QA-0064). */
export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
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

    void createAuditLog({
      action: "webhook.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(endpoint.id),
      targetType: "webhook",
      metadata: { url: endpoint.url, events: endpoint.events },
    }).catch(() => undefined);

    return ok(endpoint, 201);
  });
}
