"use client";

import { StatusPill } from "@/components/ui/status-pill";

import { contentTypeLabel, statusBadge, trustBadge } from "../lib/kb-labels";

/** KB-0070: the badges that describe a page in a list. */
export function KbCollectionBadges({
  status,
  contentType,
  verifiedAt,
  verifiedWindowDays = 180,
}: {
  status?: string | null;
  contentType?: string | null;
  verifiedAt?: string | null;
  verifiedWindowDays?: number;
}) {
  const badge = statusBadge(status);
  const trust = trustBadge(verifiedAt, verifiedWindowDays);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
      {contentType ? <StatusPill tone="neutral">{contentTypeLabel(contentType)}</StatusPill> : null}
      {trust ? <StatusPill tone={trust.tone}>{trust.label}</StatusPill> : null}
    </span>
  );
}
