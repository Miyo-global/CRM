"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, memo } from "react";
import {
  usePulseSurveys, useCreateSurvey, useUpdateSurvey,
  type PulseSurvey,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, ClipboardList, Calendar, Play, Archive, BarChart3,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { isAdminOrOwner } from "@/lib/constants/roles";
import type { Tone } from "@/lib/design/tones";
import { DatePicker } from "@/components/ui/date-picker";

function statusTone(s: string | null): Tone {
  if (s === "ACTIVE") return "success";
  if (s === "CLOSED") return "neutral";
  return "warning";
}


interface SurveyCardProps {
  s: PulseSurvey;
  isAdmin: boolean;
  onPublish: (id: number) => void;
  onClose: (id: number) => void;
  pending?: boolean;
}

const SurveyCard = memo(function SurveyCard({ s, isAdmin, onPublish, onClose, pending }: SurveyCardProps) {
  const handlePublish = useCallback(() => onPublish(s.id), [onPublish, s.id]);
  const handleClose = useCallback(() => onClose(s.id), [onClose, s.id]);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <StatusPill tone={statusTone(s.status)} dot>{s.status ?? "DRAFT"}</StatusPill>
          {s.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{s.title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1"><ClipboardList className="size-3.5" aria-hidden="true" />{s.questions?.length ?? 0} questions</span>
          <span className="flex items-center gap-1"><BarChart3 className="size-3.5" aria-hidden="true" />{s.responses?.length ?? 0} responses</span>
          {s.closesAt && <span className="flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />Closes {format(new Date(s.closesAt), "MMM d")}</span>}
        </div>
        {isAdmin && s.status === "DRAFT" && (
          <Button size="sm" variant="outline" className="mt-auto w-full" onClick={handlePublish} loading={pending}>
            <Play className="size-4" aria-hidden="true" />Publish
          </Button>
        )}
        {isAdmin && s.status === "ACTIVE" && (
          <Button size="sm" variant="outline" className="mt-auto w-full" onClick={handleClose}>
            <Archive className="size-4" aria-hidden="true" />Close Survey
          </Button>
        )}
      </CardContent>
    </Card>
  );
});


export default function SurveysPage() {
  const { data: session } = useSession();
  const { data: surveys, isLoading, isError, error, refetch } = usePulseSurveys();
  const create = useCreateSurvey();
  const update = useUpdateSurvey();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [closeId, setCloseId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), questions: [{ id: "q1", text: "How satisfied are you?", type: "rating" }], closesAt: closesAt || undefined },
      {
        onSuccess: () => {
          toast.success("Survey created"); setSheetOpen(false);
          setTitle(""); setClosesAt("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, closesAt, create]);

  const handlePublish = useCallback((id: number) => {
    update.mutate({ id, status: "ACTIVE" }, {
      onSuccess: () => toast.success("Survey published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [update]);

  const handleCloseOpen = useCallback((id: number) => setCloseId(id), []);

  const handleClose = useCallback(() => {
    if (!closeId) return;
    update.mutate({ id: closeId, status: "CLOSED" }, {
      onSuccess: () => { toast.success("Survey closed"); setCloseId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [closeId, update]);

  const handleCloseDialogChange = useCallback((open: boolean) => {
    if (!open) setCloseId(null);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Pulse surveys">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Pulse surveys"
      badge={`${surveys?.length ?? 0} surveys`}
      actions={isAdmin ? <Button size="sm" onClick={handleOpenSheet}><Plus className="size-4" aria-hidden="true" />Create Survey</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !surveys?.length ? (
        <EmptyState
          title="No surveys created yet."
          {...(isAdmin ? { action: { label: "Create Survey", onClick: handleOpenSheet } } : {})}
        />
      ) : (
        <div className="space-y-4">
        <StatsStrip
          items={[
            { label: "Active", value: surveys.filter((s) => s.status === "ACTIVE").length, tone: "success" },
            { label: "Draft", value: surveys.filter((s) => (s.status ?? "DRAFT") === "DRAFT").length },
            { label: "Closed", value: surveys.filter((s) => s.status === "CLOSED").length },
            { label: "Responses", value: surveys.reduce((n, s) => n + (s.responses?.length ?? 0), 0) },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {surveys.map((s: PulseSurvey) => (
            <SurveyCard
              key={s.id}
              s={s}
              isAdmin={isAdmin}
              onPublish={handlePublish}
              onClose={handleCloseOpen}
              pending={update.isPending && update.variables?.id === s.id && update.variables?.status === "ACTIVE"}
            />
          ))}
        </div>
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create survey" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Survey Title</label>
          <Input placeholder="e.g., Q1 Engagement Survey" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Closes At</label>
          <DatePicker value={closesAt} onChange={setClosesAt} />
        </div>
        <p className="text-xs text-muted-foreground">A default satisfaction question will be added. Edit questions after creation.</p>
      </HrSheet>

      <ConfirmActionDialog
        open={closeId !== null}
        onOpenChange={handleCloseDialogChange}
        title="Close survey"
        description="Close this survey? No more responses will be accepted."
        confirmLabel="Close"
        variant="default"
        onConfirm={handleClose}
        isPending={update.isPending}
      />
    </PageWrapper>
  );
}
