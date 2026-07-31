import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";

const VALID_SCOPES = [
  "leads:read", "leads:write",
  "deals:read", "deals:write",
  "contacts:read", "contacts:write",
  "hr:read", "hr:write",
  "*",
] as const;

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scopes: z.array(z.string()).default([]),
  expiresAt: z
    .string()
    .datetime()
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: "expiresAt must be in the future",
    })
    .optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can manage API keys.", 403);
    }
    const keys = await db.query.apiKeys.findMany({
      where: and(eq(apiKeys.orgId, session.orgId), eq(apiKeys.isRevoked, false)),
      columns: { keyHash: false },
      with: { creator: { columns: { name: true, email: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return ok(keys);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create API keys.", 403);
    }
    const body = await parseBody(req, createApiKeySchema);

    const invalidScopes = body.scopes.filter((s) => !VALID_SCOPES.includes(s as typeof VALID_SCOPES[number]));
    if (invalidScopes.length > 0) {
      return err(`Invalid scopes: ${invalidScopes.join(", ")}. Valid scopes: ${VALID_SCOPES.join(", ")}`, 400);
    }

    const rawKey = `miyoglobal_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 16);
    const id = randomBytes(16).toString("hex");

    await db.insert(apiKeys).values({
      id,
      orgId: session.orgId,
      name: body.name,
      description: body.description,
      keyHash,
      keyPrefix,
      scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: session.user.id,
    });

    return ok({ id, key: rawKey, keyPrefix, name: body.name, scopes: body.scopes }, 201);
  });
}
