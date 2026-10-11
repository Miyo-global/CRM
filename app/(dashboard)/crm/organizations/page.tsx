"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2, Globe, Users, ChevronLeft, ChevronRight, Heart, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ListToolbar } from "@/components/shared/list-toolbar";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProjectsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations } from "@/lib/api/hooks/crm";
import { CreateOrgDialog } from "@/features/crm/organizations/create-org-dialog";

const PAGE_SIZE = 20;

function getHealthBadge(score: number | null): { label: string; tone: Tone } {
  if (score === null || score === undefined) return { label: "N/A", tone: "neutral" };
  if (score >= 70) return { label: "Healthy", tone: "success" };
  if (score >= 40) return { label: "At Risk", tone: "warning" };
  return { label: "Critical", tone: "danger" };
}

export default function OrganizationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const search = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, error, refetch } = useCrmOrganizations({
    search: search || undefined,
    limit: PAGE_SIZE,
    page,
  });

  const totalPages = data?.totalPages ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Organizations" subtitle="Company accounts">
        <div className="space-y-6">
          <Skeleton className="h-9 w-full sm:w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 rounded-lg" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  const organizations = data?.organizations ?? [];

  return (
    <PageWrapper
      title="Organizations"
      subtitle={`${data?.totalCount ?? 0} organizations`}
      actions={<CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />}
      filters={
        <ListToolbar
          search={{
            value: search,
            onChange: (v) => updateParams({ q: v || null, page: null }),
            placeholder: "Search organizations...",
          }}
        />
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load organizations" error={error} onRetry={() => refetch()} />
      ) : organizations.length === 0 ? (
        search ? (
          <EmptyState
            illustration={<EmptySearchIllustration className="size-32" />}
            title="No results for these filters"
            description={`No organizations match "${search}".`}
            action={{ label: "Clear filters", onClick: () => updateParams({ q: null, page: null }) }}
          />
        ) : (
          <EmptyState
            illustration={<EmptyProjectsIllustration className="size-32" />}
            title="No organizations found"
            description="Create your first organization"
          />
        )
      ) : (
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {organizations.map(org => {
            const health = getHealthBadge(org.healthScore);
            return (
              <Card key={org.id} interactive className="group">
                <Link href={`/crm/organizations/${org.id}`} className="block h-full rounded-lg focus-visible:focus-ring">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand-soft-foreground">
                        {org.name[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" title={org.name}>{org.name}</p>
                        {org.industry && <p className="truncate text-xs text-muted-foreground">{org.industry}</p>}
                      </div>
                    </div>
                    <StatusPill tone={health.tone} className="tabular-nums">
                      <Heart aria-hidden="true" />
                      {org.healthScore !== null ? `${org.healthScore}%` : "N/A"}
                      <span className="sr-only"> {health.label}</span>
                    </StatusPill>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {org.domain && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{org.domain}</span>
                      </div>
                    )}
                    {org.size && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="tabular-nums">{org.size} employees</span>
                      </div>
                    )}
                    {org.website && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-brand-text">
                          {org.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {org.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{org.description}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <span className="flex items-center gap-1 text-xs text-brand-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      View details <ArrowRight className="size-3" aria-hidden="true" />
                    </span>
                  </div>
                </CardContent>
                </Link>
              </Card>
            );
          })}
        </motion.div>

        {totalPages > 1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
              <ChevronRight className="size-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
      )}
    </PageWrapper>
  );
}
