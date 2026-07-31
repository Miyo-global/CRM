"use client";

import { useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useProjects } from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCard } from "./project-card";
import { ProjectListRow } from "./project-list-row";
import { ProjectFilterBar } from "./project-filter-bar";
import { ProjectPagination } from "./project-pagination";
import { ProjectsEmptyState } from "./projects-empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useDebouncedValue } from "@/hooks/use-expense-filters";
import { Skeleton } from "@/components/ui/skeleton";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ViewMode = "grid" | "list";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const status = (searchParams.get("status") as StatusFilter) || "ALL";
  const page = Number(searchParams.get("page")) || 1;
  const viewMode = (searchParams.get("view") as ViewMode) || "grid";

  const debouncedSearch = useDebouncedValue(search, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";

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

  const handleSearchChange = useCallback(
    (value: string) => updateParams({ q: value || null, page: null }),
    [updateParams],
  );
  const handleStatusChange = useCallback(
    (value: StatusFilter) =>
      updateParams({ status: value === "ALL" ? null : value, page: null }),
    [updateParams],
  );
  const handleViewModeChange = useCallback(
    (value: ViewMode) => updateParams({ view: value === "grid" ? null : value }),
    [updateParams],
  );
  const setPage = useCallback(
    (p: number) => updateParams({ page: p === 1 ? null : String(p) }),
    [updateParams],
  );

  const { data, isLoading } = useProjects({
    page,
    limit: 12,
    search: apiSearch || undefined,
    status,
  });

  const projects = data?.data ?? [];
  const pagination = data
    ? { page: data.page, total: data.total, totalPages: data.totalPages }
    : undefined;

  return (
    <PageWrapper
      title="Projects"
      badge={pagination?.total ? String(pagination.total) : undefined}
      actions={<NewProjectDialog />}
      filters={
        <ProjectFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          status={status}
          onStatusChange={handleStatusChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      }
    >
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-14 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full rounded-full" />
                <div className="flex justify-between pt-2 border-t">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-6 w-6 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-56 max-w-[70%]" />
                    <Skeleton className="h-3 w-80 max-w-[90%]" />
                  </div>
                  <div className="hidden md:flex md:items-center md:gap-3 md:min-w-[220px]">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex -space-x-1.5 shrink-0">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-6 w-6 rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : projects.length === 0 && !debouncedSearch && status === "ALL" ? (
        <ProjectsEmptyState />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <EmptySearchIllustration className="mb-4 h-36 w-36 opacity-95" />
          <p className="text-muted-foreground text-sm">
            No projects match your filters.
          </p>
          <button
            onClick={() => updateParams({ q: null, status: null, page: null })}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Projects grid"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={fadeUp} className="h-full">
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          role="list"
          aria-label="Projects list"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={fadeUp}>
              <ProjectListRow project={project} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <ProjectPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </PageWrapper>
  );
}
