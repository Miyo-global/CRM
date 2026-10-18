import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireKnowledgeBase } from "@/lib/knowledge/gate";

/**
 * KB-0067: the Knowledge Base gate.
 *
 * With the org flag off the module does not exist: a 404, not a "turn this on"
 * page, so nothing leaks about what is behind it. Page and space access is
 * narrower still and is checked by each route and page.
 */
export default async function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  if (await requireKnowledgeBase(authed.orgId)) notFound();

  return children;
}
