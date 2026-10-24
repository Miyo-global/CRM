import { notFound } from "next/navigation";

import { WikiDocPage } from "@/features/knowledge/components/wiki-doc-page";

export const dynamic = "force-dynamic";

/**
 * R3-PRJ-05: pageHref() has always pointed here, but the route was never
 * added, so every new page redirected to the app's 404. Access is decided by
 * GET /api/knowledge/pages/:id (same org scope as the create).
 */
export default async function KnowledgeDocPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const id = Number(pageId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  return <WikiDocPage pageId={id} />;
}
