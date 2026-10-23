import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { kbPageAttachments, kbPages } from "@/lib/db/schema";
import { hashPublicToken } from "@/lib/knowledge/public-token";
import { getFileUrl, isStorageConfigured } from "@/lib/storage";

/** A signed URL for an image on a shared page, good for five minutes. */
const KB_PUBLIC_MEDIA_URL_TTL_SECONDS = 300;

/**
 * KB-0048: serve a shared page's media without making the bucket public.
 *
 * The attachment is only served when it belongs to the very page the token
 * opens, so a valid token for one page cannot be used to fish for another
 * page's files.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const noindex = { "X-Robots-Tag": "noindex, nofollow" };

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noindex });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "File storage is not configured", code: "KB_STORAGE_NOT_CONFIGURED" },
      { status: 503, headers: noindex },
    );
  }

  const key = new URL(req.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400, headers: noindex });
  }

  const rows = await db
    .select({ fileKey: kbPageAttachments.fileKey })
    .from(kbPages)
    .innerJoin(
      kbPageAttachments,
      and(
        eq(kbPageAttachments.pageId, kbPages.id),
        eq(kbPageAttachments.orgId, kbPages.orgId),
        isNull(kbPageAttachments.deletedAt),
      ),
    )
    .where(
      and(
        eq(kbPages.publicTokenHash, hashPublicToken(token)),
        eq(kbPages.visibility, "public"),
        isNull(kbPages.deletedAt),
        eq(kbPageAttachments.fileKey, key),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noindex });
  }

  return NextResponse.json(
    { url: await getFileUrl(key, KB_PUBLIC_MEDIA_URL_TTL_SECONDS) },
    { headers: noindex },
  );
}
