"use client";

import { use } from "react";
import { useCrmPage } from "@/lib/api/hooks/marketing";
import { PageBuilder } from "@/features/marketing/landing-pages/page-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { FileQuestion } from "lucide-react";

type Props = { params: Promise<{ pageId: string }> };

export default function EditLandingPagePage({ params }: Props) {
  const { pageId: rawId } = use(params);
  const pid = Number(rawId);
  const { data: page, isLoading, isError, error, refetch } = useCrmPage(pid > 0 ? pid : null);

  if (isLoading) {
    return (
      <PageWrapper title="Edit Landing Page" subtitle="Loading…">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Edit Landing Page">
        <QueryErrorState title="Couldn't load this landing page" error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  if (!page) {
    return (
      <PageWrapper title="Edit Landing Page">
        <EmptyState
          icon={FileQuestion}
          title="Landing page not found"
          description="It may have been deleted, or the link is wrong."
          action={{ label: "Back to landing pages", href: "/marketing/landing-pages" }}
        />
      </PageWrapper>
    );
  }

  return <PageBuilder page={page} />;
}
