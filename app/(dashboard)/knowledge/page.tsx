import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { getKbCapabilities } from "@/lib/knowledge/config";
import { knowledgeAiEnabled } from "@/lib/knowledge/gate";
import { getOrgFeatureFlags } from "@/lib/org-features";
import { KB_CHAT, KNOWLEDGE_BASE } from "@/lib/knowledge/routes";

export const dynamic = "force-dynamic";

/**
 * KB-0067: /knowledge has no page of its own.
 *
 * Ask is the front door where there is an AI key and the org wants it; the wiki
 * is the front door everywhere else. Deciding here rather than in the
 * middleware keeps the key check on the server and out of the URL.
 */
export default async function KnowledgePage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const [capabilities, flags] = await Promise.all([
    getKbCapabilities(authed.orgId),
    getOrgFeatureFlags(authed.orgId),
  ]);

  redirect(knowledgeAiEnabled(flags, capabilities) ? KB_CHAT : KNOWLEDGE_BASE);
}
