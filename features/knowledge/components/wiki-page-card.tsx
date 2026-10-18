"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { KbPageSummary } from "@/lib/api/hooks/knowledge";
import { timeAgo } from "@/lib/date-utils";
import { pageHref } from "@/lib/knowledge/routes";

import { KbCollectionBadges } from "./kb-collection-badges";

/** KB-0070: one page as a card, for Recent and Favourites. */
export function WikiPageCard({ page }: { page: KbPageSummary }) {
  return (
    <Card className="transition-colors hover:border-border-strong">
      <CardContent className="p-4">
        <Link href={pageHref(page.id)} className="flex items-start gap-2">
          {page.icon ? (
            <span aria-hidden className="text-base leading-6">
              {page.icon}
            </span>
          ) : (
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">
              {page.title || "Untitled"}
            </span>
            {page.excerpt ? (
              <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                {page.excerpt}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="mt-3 flex items-center justify-between gap-2">
          <KbCollectionBadges status={page.status} contentType={page.contentType} />
          {page.updatedAt ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(page.updatedAt)}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
