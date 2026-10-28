"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Clock, Users, PlayCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { isAdminOrOwner } from "@/lib/constants/roles";

interface Assessment {
  id: number; title: string; description: string | null; category: string | null;
  durationMinutes: number | null; status: string | null; questionCount: number;
  completedCount: number; createdAt: string | null;
}

const assessKeys = { all: [...queryKeys.hr.all, "assessments"] as const, list: () => [...assessKeys.all, "list"] as const };

function statusTone(s: string | null): Tone {
  if (s === "PUBLISHED") return "success";
  if (s === "DRAFT" || s === null) return "neutral";
  return "info";
}

export default function AssessmentsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: assessKeys.list(),
    queryFn: () => apiClient.get<Assessment[]>("/hr/assessments"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; description?: string; category?: string; durationMinutes?: number }) =>
      apiClient.post<Assessment>("/hr/assessments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assessKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("30");

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), description: description || undefined, category: category || undefined, durationMinutes: Number(duration) || 30 },
      {
        onSuccess: () => {
          toast.success("Assessment created"); setSheetOpen(false);
          setTitle(""); setDescription(""); setCategory(""); setDuration("30");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, category, duration, create]);

  if (isLoading) {
    return (
      <PageWrapper title="Assessments">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills assessments"
      badge={`${items?.length ?? 0} assessments`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Create Assessment</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !items?.length ? (
        <EmptyState
          title="No assessments available"
          description="Published skill assessments and quizzes will appear here."
          {...(isAdmin ? { action: { label: "Create Assessment", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((a: Assessment) => (
            <Card key={a.id}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <StatusPill tone={statusTone(a.status)} dot>{a.status ?? "DRAFT"}</StatusPill>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold leading-tight">{a.title}</h3>
                  {a.category && <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{a.category}</p>}
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                  {a.durationMinutes && <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{a.durationMinutes} min</span>}
                  <span className="flex items-center gap-1"><ClipboardCheck className="size-3.5" aria-hidden="true" />{a.questionCount} questions</span>
                  <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{a.completedCount} completed</span>
                </div>
                {a.status === "PUBLISHED" && (
                  <Button size="sm" variant="outline" className="mt-auto w-full">
                    <PlayCircle className="size-4" aria-hidden="true" />Take Assessment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create assessment" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., JavaScript Proficiency" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Assessment details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Input placeholder="e.g., Technical" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
