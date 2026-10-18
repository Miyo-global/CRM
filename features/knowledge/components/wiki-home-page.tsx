"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateKbPage, useKbFavoritePages, useKbRecentPages } from "@/lib/api/hooks/knowledge";
import { pageHref } from "@/lib/knowledge/routes";

import { NewPageButton } from "./new-page-button";
import { WikiCompanyDocumentsStrip } from "./wiki-company-documents-strip";
import { WikiHomeAllPages } from "./wiki-home-all-pages";
import { WikiPageCard } from "./wiki-page-card";

/**
 * KB-0070: the wiki front page.
 *
 * Recent first, because the page you want is usually one you just had open.
 * ?view= narrows to one section, which is what the sidebar's Recent and
 * Favourites links use.
 */
export function WikiHomePage() {
  const view = useSearchParams()?.get("view");
  const createBlank = useCreateBlankPage();
  const recent = useKbRecentPages();
  const favorites = useKbFavoritePages();

  const showRecent = !view || view === "recent";
  const showFavorites = !view || view === "favourites";
  const showAll = !view;

  const recentPages = recent.data?.items ?? [];
  const favoritePages = favorites.data?.items ?? [];

  const isEmpty =
    !recent.isLoading &&
    !favorites.isLoading &&
    recentPages.length === 0 &&
    favoritePages.length === 0;

  return (
    <PageWrapper
      title="Wiki"
      subtitle="Everything the team has written down"
      actions={<NewPageButton />}
      breadcrumbs={false}
    >
      {isEmpty && !view ? (
        <EmptyState
          title="Nothing written down yet"
          description="Start with a page. Anyone at Miyo will be able to find it."
          action={{ label: "New page", onClick: createBlank.create }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {showRecent ? (
            <PageCardSection
              heading="Recent"
              pages={recentPages}
              loading={recent.isLoading}
              emptyText="Pages you open will show up here."
            />
          ) : null}

          {showFavorites ? (
            <PageCardSection
              heading="Favourites"
              pages={favoritePages}
              loading={favorites.isLoading}
              emptyText="Star a page to keep it here."
            />
          ) : null}

          <WikiCompanyDocumentsStrip />

          {showAll ? <WikiHomeAllPages /> : null}
        </div>
      )}
    </PageWrapper>
  );
}

function PageCardSection({
  heading,
  pages,
  loading,
  emptyText,
}: {
  heading: string;
  pages: Parameters<typeof WikiPageCard>[0]["page"][];
  loading: boolean;
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">{heading}</h2>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <WikiPageCard key={page.id} page={page} />
          ))}
        </div>
      )}
    </section>
  );
}

/** The empty state needs a plain callback, not the split button. */
function useCreateBlankPage() {
  const router = useRouter();
  const createPage = useCreateKbPage();

  return {
    create: () =>
      createPage.mutate(
        {},
        {
          onSuccess: (page) => router.push(pageHref(page.id)),
          onError: () => toast.error("Couldn't create the page."),
        },
      ),
  };
}
