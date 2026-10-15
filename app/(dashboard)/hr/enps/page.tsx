"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ThumbsUp, BarChart3, Users, Calendar } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";

interface EnpsSurvey {
  id: number; title: string; status: string | null; score: number | null;
  promoters: number; passives: number; detractors: number;
  totalResponses: number; closesAt: string | null; createdAt: string | null;
}

const enpsKeys = { all: [...queryKeys.hr.all, "enps"] as const, list: () => [...enpsKeys.all, "list"] as const };

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 50) return "text-success-strong";
  if (score >= 0) return "text-warning-strong";
  return "text-danger-strong";
}

function statusTone(s: string | null): Tone {
  if (s === "ACTIVE") return "success";
  if (s === "CLOSED") return "neutral";
  return "warning";
}

export default function EnpsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: surveys, isLoading, isError, error, refetch } = useQuery({
    queryKey: enpsKeys.list(),
    queryFn: () => apiClient.get<EnpsSurvey[]>("/hr/enps"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; closesAt?: string }) =>
      apiClient.post<EnpsSurvey>("/hr/enps", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: enpsKeys.list() }),
  });

  const submit = useMutation({
    mutationFn: (data: { surveyId: number; score: number; feedback?: string }) =>
      apiClient.post<{ success: boolean }>("/hr/enps/respond", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: enpsKeys.list() }); toast.success("Response submitted"); },
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [respondId, setRespondId] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState("8");
  const [feedback, setFeedback] = useState("");

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), closesAt: closesAt || undefined },
      {
        onSuccess: () => {
          toast.success("eNPS survey created"); setSheetOpen(false);
          setTitle(""); setClosesAt("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, closesAt, create]);

  const handleSubmitResponse = useCallback(() => {
    if (!respondId) return;
    submit.mutate(
      { surveyId: respondId, score: Number(npsScore), feedback: feedback || undefined },
      {
        onSuccess: () => { setRespondId(null); setNpsScore("8"); setFeedback(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [respondId, npsScore, feedback, submit]);

  if (isLoading) {
    return (
      <PageWrapper title="Employee NPS" subtitle="Measure employee loyalty">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee NPS"
      subtitle="Measure and track employee Net Promoter Score"
      badge={`${surveys?.length ?? 0} surveys`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />New eNPS</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !surveys?.length ? (
        <EmptyState
          title="No eNPS surveys yet"
          description="Create a survey to start measuring employee Net Promoter Score."
          {...(isAdmin ? { action: { label: "New eNPS", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {surveys.map((s: EnpsSurvey) => (
            <Card key={s.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <StatusPill tone={statusTone(s.status)} dot>{s.status ?? "DRAFT"}</StatusPill>
                  {s.score !== null && (
                    <span className={cn("font-display text-2xl font-extrabold leading-none tabular-nums", scoreColor(s.score))}>{s.score}</span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{s.title}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium tabular-nums">
                  <span className="text-success-strong">Promoters: {s.promoters}</span>
                  <span className="text-warning-strong">Passives: {s.passives}</span>
                  <span className="text-danger-strong">Detractors: {s.detractors}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{s.totalResponses} responses</span>
                  {s.closesAt && <span className="flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />Closes {format(new Date(s.closesAt), "MMM d")}</span>}
                </div>
                {s.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" className="mt-auto w-full" onClick={() => setRespondId(s.id)}>
                    <BarChart3 className="size-4" aria-hidden="true" />Respond
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create eNPS Survey" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., Q1 2026 eNPS" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Closes At</label>
          <Input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </div>
      </HrSheet>

      <HrSheet open={respondId !== null} onOpenChange={(open) => { if (!open) setRespondId(null); }} title="eNPS Response" onSubmit={handleSubmitResponse} submitLabel="Submit" isPending={submit.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">On a scale of 0-10, how likely are you to recommend this company?</label>
          <Input type="number" min={0} max={10} value={npsScore} onChange={(e) => setNpsScore(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Feedback (optional)</label>
          <Textarea placeholder="Tell us why..." value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
