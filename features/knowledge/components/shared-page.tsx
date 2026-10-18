"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPages } from "@/lib/api/hooks/knowledge";

import { WikiPageCollectionTable } from "./wiki-page-collection-table";

/**
 * KB-0083: Shared with me.
 *
 * Only pages someone granted to this person or their role, and not their own
 * work — a page you wrote belongs under My pages, not here.
 */
export function SharedPage() {
  const { data, isLoading } = useKbPages({ scope: "shared", limit: 50 });
  const pages = data?.items ?? [];

  return (
    <PageWrapper title="Shared with me" subtitle="Pages someone gave you access to" breadcrumbs={false}>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : pages.length === 0 ? (
        <EmptyState
          title="Nothing shared with you yet"
          description="A page shared with you, or with your role, shows up here."
        />
      ) : (
        <WikiPageCollectionTable pages={pages} />
      )}
    </PageWrapper>
  );
}
