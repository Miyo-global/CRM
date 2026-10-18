"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPages } from "@/lib/api/hooks/knowledge";

import { NewPageButton } from "./new-page-button";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

/**
 * KB-0083: My pages.
 *
 * Everything this person created, private space or not. A new employee lands
 * here with nothing, so the empty state is the first thing it has to get right.
 */
export function PrivatePage() {
  const { data, isLoading } = useKbPages({ scope: "private", limit: 50 });
  const pages = data?.items ?? [];

  return (
    <PageWrapper
      title="My pages"
      subtitle="Pages you created"
      actions={<NewPageButton />}
      breadcrumbs={false}
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : pages.length === 0 ? (
        <EmptyState
          title="You haven't written a page yet"
          description="Pages you create show up here, whether or not you share them."
        />
      ) : (
        <WikiPageCollectionTable pages={pages} />
      )}
    </PageWrapper>
  );
}
