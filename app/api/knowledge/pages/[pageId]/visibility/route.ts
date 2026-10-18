import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { getOrgFeatureFlags } from "@/lib/org-features";
import { kbContext } from "@/lib/knowledge/actor";
import { isKbAdmin, resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { canPublishPublicly } from "@/lib/knowledge/page-status";
import {
  generatePublicToken,
  hashPublicToken,
  publicShareUrl,
} from "@/lib/knowledge/public-token";
import { resolveSpaceRole } from "@/lib/knowledge/space-access";

const schema = z.object({ visibility: z.enum(["private", "org", "public"]) }).strict();

interface VisibilityResult {
  id: number;
  visibility: string;
  /** Present once, when a public link has just been issued. */
  shareUrl?: string;
  linkRevoked?: boolean;
}

/**
 * KB-0047 and KB-0048: change who can see a page, and issue or revoke its
 * public link.
 *
 * Going public mints a token and returns the URL once — only the hash is kept,
 * so this response is the single chance to copy it. Leaving public revokes the
 * link immediately rather than leaving a URL that still resolves.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, spaceId: true, visibility: true, publicTokenHash: true },
    });
    if (!page) return kbNotFound();

    try {
      const { visibility } = await parseBody(req, schema);

      if (visibility === "public") {
        const flags = await getOrgFeatureFlags(session.orgId);
        const allowed = canPublishPublicly({
          isKbAdmin: isKbAdmin(ctx.actor),
          permissions: ctx.actor.permissions ?? [],
          spaceRole: await resolveSpaceRole(ctx.actor, page.spaceId ?? 0),
          publicSharingEnabled: flags.knowledgePublicSharing,
        });
        if (!allowed) {
          return err(
            flags.knowledgePublicSharing
              ? "Publishing a page publicly needs a publisher role or kb:pages:manage."
              : "Public sharing is switched off for this organisation.",
            403,
          );
        }

        const token = generatePublicToken();
        await db
          .update(kbPages)
          .set({
            visibility: "public",
            publicTokenHash: hashPublicToken(token),
            publicToken: null,
            publicTokenRevision: sql`${kbPages.publicTokenRevision} + 1`,
            aclRevision: sql`${kbPages.aclRevision} + 1`,
            aclRevisionChangedAt: new Date(),
            updatedAt: new Date(),
            lastEditedById: session.user.id,
          })
          .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

        await createAuditLog({
          action: "kb.share_link.created",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: String(id),
          targetType: "kb_page",
        });

        // The only time the token is ever readable.
        return ok<VisibilityResult>({
          id,
          visibility: "public",
          shareUrl: publicShareUrl(token, req.nextUrl.origin),
        });
      }

      const wasPublic = !!page.publicTokenHash;
      await db
        .update(kbPages)
        .set({
          visibility,
          publicToken: null,
          publicTokenHash: null,
          ...(wasPublic
            ? { publicTokenRevision: sql`${kbPages.publicTokenRevision} + 1` }
            : {}),
          aclRevision: sql`${kbPages.aclRevision} + 1`,
          aclRevisionChangedAt: new Date(),
          updatedAt: new Date(),
          lastEditedById: session.user.id,
        })
        .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

      await createAuditLog({
        action: "kb.page.visibility_changed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(id),
        targetType: "kb_page",
        metadata: { from: page.visibility, to: visibility, linkRevoked: wasPublic },
      });

      if (wasPublic) {
        await createAuditLog({
          action: "kb.share_link.revoked",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: String(id),
          targetType: "kb_page",
        });
      }

      return ok<VisibilityResult>({ id, visibility, linkRevoked: wasPublic });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid request.", 400);
      throw error;
    }
  }, req);
}
