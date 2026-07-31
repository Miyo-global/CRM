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
import { format } from "date-fns";
import { Plus, ThumbsUp, BarChart3, Users, Calendar } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

interface EnpsSurvey {
  id: number; title: string; status: string | null; score: number | null;
  promoters: number; passives: number; detractors: number;
  totalResponses: number; closesAt: string | null; createdAt: string | null;
}

const enpsKeys = { all: [...queryKeys.hr.all, "enps"] as const, list: () => [...enpsKeys.all, "list"] as const };

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 50) return "text-green-600";
  if (score >= 0) return "text-amber-600";
  return "text-red-600";
}

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "ACTIVE") return "default";
  if (s === "CLOSED") return "outline";
  return "secondary";
}

export default function EnpsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

  const { data: surveys, isLoading } = useQuery({
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee NPS"
      subtitle="Measure and track employee Net Promoter Score"
      badge={`${surveys?.length ?? 0} surveys`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New eNPS</Button> : undefined}
    >
      {!surveys?.length ? (
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-32 w-32 opacity-95" />}
          title="No eNPS surveys yet"
          description="Create a survey to start measuring employee Net Promoter Score."
          {...(isAdmin ? { action: { label: "New eNPS", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s: EnpsSurvey) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant={statusBadge(s.status)} className="text-[10px]">{s.status ?? "DRAFT"}</Badge>
                  {s.score !== null && (
                    <span className={`text-lg font-bold ${scoreColor(s.score)}`}>{s.score}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold leading-tight">{s.title}</h3>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-green-600">Promoters: {s.promoters}</span>
                  <span className="text-amber-600">Passives: {s.passives}</span>
                  <span className="text-red-600">Detractors: {s.detractors}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{s.totalResponses} responses</span>
                  {s.closesAt && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />Closes {format(new Date(s.closesAt), "MMM d")}</span>}
                </div>
                {s.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => setRespondId(s.id)}>
                    <BarChart3 className="h-3 w-3 mr-1" />Respond
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
