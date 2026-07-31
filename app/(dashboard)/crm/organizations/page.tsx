"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Building2, Globe, Users, ChevronLeft, ChevronRight, Heart, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations } from "@/lib/api/hooks/crm";
import { CreateOrgDialog } from "@/features/crm/organizations/create-org-dialog";

const PAGE_SIZE = 20;

function getHealthBadge(score: number | null) {
  if (score === null || score === undefined) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted/50" };
  if (score >= 70) return { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-500/15" };
  if (score >= 40) return { label: "At Risk", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "Critical", color: "text-red-400", bg: "bg-red-500/15" };
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

  const { data, isLoading } = useCrmOrganizations({
    search: search || undefined,
    limit: PAGE_SIZE,
    page,
  });

  const totalPages = data?.totalPages ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Organizations" subtitle="Company accounts">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-sm" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organizations"
      subtitle={`${data?.totalCount ?? 0} organizations`}
      actions={<CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />}
      filters={
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
            className="pl-9"
          />
        </div>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.organizations.map(org => {
            const health = getHealthBadge(org.healthScore);
            return (
              <Card key={org.id} className="shadow-sm hover:shadow-md transition-all hover:border-gold/40 cursor-pointer group">
                <Link href={`/crm/organizations/${org.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center text-sm font-semibold text-gold shrink-0">
                        {org.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        {org.industry && <p className="text-xs text-muted-foreground">{org.industry}</p>}
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", health.bg, health.color)}>
                      <Heart className="h-2.5 w-2.5 mr-0.5" />
                      {org.healthScore !== null ? `${org.healthScore}%` : "N/A"}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {org.domain && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{org.domain}</span>
                      </div>
                    )}
                    {org.size && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3 shrink-0" />
                        <span>{org.size} employees</span>
                      </div>
                    )}
                    {org.website && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-gold">
                          {org.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {org.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{org.description}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <span className="text-xs text-gold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
                </Link>
              </Card>
            );
          })}
        </motion.div>

        {(data?.organizations.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <EmptyProjectsIllustration className="mx-auto mb-3 w-36 h-36" />
            <p className="text-sm font-medium text-foreground">No organizations found</p>
            <p className="text-xs mt-1">Create your first organization</p>
          </div>
        )}

        {totalPages > 1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
