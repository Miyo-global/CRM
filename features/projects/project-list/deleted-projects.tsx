"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse, ProjectListItem } from "@/types/projects";

export function DeletedProjects() {
  const queryClient = useQueryClient();
  const query = useQuery<PaginatedResponse<ProjectListItem>>({
    queryKey: queryKeys.projects.list({ deleted: 1 }),
    queryFn: () => apiClient.get("/projects", { deleted: 1, limit: 100 }),
  });
  const restore = useMutation<unknown, Error, ProjectListItem>({
    mutationFn: (p) => apiClient.post(`/projects/${p.id}/restore`),
    onSuccess: (_d, p) => {
      toast.success(`Restored ${p.name}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }
  if (query.isError) return <QueryErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data?.data ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={Trash2} title="No deleted projects" description="Projects you delete show up here so you can restore them." />;
  }

  return (
    <ul className="space-y-2" aria-label="Deleted projects">
      {rows.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{p.key}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
          <Button
            variant="outline"
            onClick={() => restore.mutate(p)}
            loading={restore.isPending && restore.variables?.id === p.id}
          >
            <ArchiveRestore className="size-4" aria-hidden="true" />
            Restore
          </Button>
        </li>
      ))}
    </ul>
  );
}
