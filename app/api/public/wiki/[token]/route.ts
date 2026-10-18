import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { kbPages, kbSpaces } from "@/lib/db/schema";
import { hashPublicToken } from "@/lib/knowledge/public-token";

/**
 * KB-0048: the public read of a shared page.
 *
 * No session, so everything protective has to be in the query: the lookup is by
 * token hash, the page must still be public and not deleted, and its space must
 * not be archived. Only the title, content and timestamps go out — no author
 * ids, no emails, no space internals.
 *
 * The response is noindex: a shared link is for the person it was sent to, not
 * for a search engine that found it in a referrer log.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const notFound = () =>
    NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } },
    );

  // A token is 64 hex characters; anything else is not worth a query.
  if (!/^[a-f0-9]{64}$/.test(token)) return notFound();

  const rows = await db
    .select({
      id: kbPages.id,
      title: kbPages.title,
      icon: kbPages.icon,
      coverImage: kbPages.coverImage,
      content: kbPages.content,
      excerpt: kbPages.excerpt,
      seoTitle: kbPages.seoTitle,
      seoDescription: kbPages.seoDescription,
      updatedAt: kbPages.updatedAt,
      spaceArchivedAt: kbSpaces.archivedAt,
    })
    .from(kbPages)
    .leftJoin(
      kbSpaces,
      and(eq(kbSpaces.id, kbPages.spaceId), eq(kbSpaces.orgId, kbPages.orgId)),
    )
    .where(
      and(
        eq(kbPages.publicTokenHash, hashPublicToken(token)),
        eq(kbPages.visibility, "public"),
        isNull(kbPages.deletedAt),
      ),
    )
    .limit(1);

  const page = rows[0];
  if (!page || page.spaceArchivedAt) return notFound();

  return NextResponse.json(
    {
      title: page.title,
      icon: page.icon,
      coverImage: page.coverImage,
      content: page.content,
      excerpt: page.excerpt,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      updatedAt: page.updatedAt,
    },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}
