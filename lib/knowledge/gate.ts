import "server-only";

import type { NextResponse } from "next/server";

import { getOrgFeatureFlags } from "@/lib/org-features";

import { kbNotFound } from "./errors";

/**
 * KB-0007: the module gate (Streamline's kb-module-gate). With knowledgeBase
 * off, the Knowledge API does not exist for that org — 404, not 403, so nothing
 * leaks about what is behind it.
 */
export async function requireKnowledgeBase(
  orgId: string,
): Promise<NextResponse<never> | null> {
  const flags = await getOrgFeatureFlags(orgId);
  return flags.knowledgeBase ? null : kbNotFound();
}

/** AI entry points need the org flag and a key behind it. */
export function knowledgeAiEnabled(
  flags: { knowledgeAi: boolean },
  capabilities: { ai: boolean },
): boolean {
  return flags.knowledgeAi && capabilities.ai;
}
