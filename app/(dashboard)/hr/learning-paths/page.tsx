"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, GraduationCap, BookOpen, Clock, BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { IconChip } from "@/components/ui/icon-chip";
import { isAdminOrOwner } from "@/lib/constants/roles";

interface LearningPath {
  id: number; title: string; description: string | null; level: string | null;
  courseCount: number; estimatedHours: number | null; enrolledCount: number;
  isEnrolled: boolean; createdAt: string | null;
}

const lpKeys = { all: [...queryKeys.hr.all, "learning-paths"] as const, list: () => [...lpKeys.all, "list"] as const };

export default function LearningPathsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: paths, isLoading, isError, error, refetch } = useQuery({
    queryKey: lpKeys.list(),
    queryFn: () => apiClient.get<LearningPath[]>("/hr/learning-paths"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; description?: string; level?: string; estimatedHours?: number }) =>
      apiClient.post<LearningPath>("/hr/learning-paths", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: lpKeys.list() }),
  });

  const enroll = useMutation({
    mutationFn: (id: number) => apiClient.post<{ success: boolean }>(`/hr/learning-paths/${id}`, { action: "enroll" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: lpKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [hours, setHours] = useState("");

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), description: description || undefined, level: level || undefined, estimatedHours: Number(hours) || undefined },
      {
        onSuccess: () => {
          toast.success("Learning path created"); setSheetOpen(false);
          setTitle(""); setDescription(""); setLevel(""); setHours("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, level, hours, create]);

  const handleEnroll = useCallback((id: number) => {
    enroll.mutate(id, {
      onSuccess: () => toast.success("Enrolled successfully"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [enroll]);

  if (isLoading) {
    return (
      <PageWrapper title="Learning Paths" subtitle="Structured learning programs">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Learning Paths"
      subtitle="Structured learning programs and career development"
      badge={`${paths?.length ?? 0} paths`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Create Path</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !paths?.length ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="size-32" />}
          title="No learning paths available."
          {...(isAdmin ? { action: { label: "Create Path", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {paths.map((lp: LearningPath) => (
            <Card key={lp.id}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <IconChip icon={GraduationCap} tone="brand" />
                  {lp.level && <Badge variant="outline" className="text-2xs">{lp.level}</Badge>}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold leading-tight">{lp.title}</h3>
                  {lp.description && <p className="text-xs text-muted-foreground line-clamp-2">{lp.description}</p>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden="true" />{lp.courseCount} courses</span>
                  {lp.estimatedHours && <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{lp.estimatedHours}h</span>}
                  <span className="flex items-center gap-1"><BarChart3 className="size-3.5" aria-hidden="true" />{lp.enrolledCount} enrolled</span>
                </div>
                <div className="mt-auto">
                  {lp.isEnrolled ? (
                    <Badge variant="success" dot className="w-full justify-center">Enrolled</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => handleEnroll(lp.id)} loading={enroll.isPending && enroll.variables === lp.id}>Enroll</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Learning Path" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., Frontend Engineering Track" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Path overview..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Level</label>
            <Input placeholder="e.g., Beginner" value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Estimated Hours</label>
            <Input type="number" placeholder="40" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
