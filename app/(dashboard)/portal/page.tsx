"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { usePortalProjects } from "@/lib/api/hooks/projects/portal";

export default function PortalPage() {
  const { data, isLoading, isError, error, refetch } = usePortalProjects();
  return (
    <PageWrapper title="Shared projects">
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <EmptyState icon={FolderOpen} title="No shared projects" description="When a team shares a project with you, it shows up here." />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/portal/${p.id}`} className="block rounded-xl border border-border bg-card p-5 hover:border-primary focus-visible:focus-ring">
                <p className="font-mono text-xs text-muted-foreground">{p.key}</p>
                <p className="mt-1 font-medium">{p.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageWrapper>
  );
}
