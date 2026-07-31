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
import { EmptyActivityIllustration } from "@/components/illustrations";

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "ACTIVE") return "default";
  if (s === "CLOSED") return "outline";
  return "secondary";
}


interface SurveyCardProps {
  s: PulseSurvey;
  isAdmin: boolean;
  onPublish: (id: number) => void;
  onClose: (id: number) => void;
}

const SurveyCard = memo(function SurveyCard({ s, isAdmin, onPublish, onClose }: SurveyCardProps) {
  const handlePublish = useCallback(() => onPublish(s.id), [onPublish, s.id]);
  const handleClose = useCallback(() => onClose(s.id), [onClose, s.id]);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <Badge variant={statusBadge(s.status)} className="text-[10px]">{s.status ?? "DRAFT"}</Badge>
          {s.isAnonymous && <Badge variant="outline" className="text-[10px]">Anonymous</Badge>}
        </div>
        <h3 className="text-sm font-semibold leading-tight">{s.title}</h3>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><ClipboardList className="h-3 w-3" />{s.questions?.length ?? 0} questions</span>
          <span className="flex items-center gap-0.5"><BarChart3 className="h-3 w-3" />{s.responses?.length ?? 0} responses</span>
          {s.closesAt && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />Closes {format(new Date(s.closesAt), "MMM d")}</span>}
        </div>
        {isAdmin && s.status === "DRAFT" && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handlePublish}>
            <Play className="h-3 w-3 mr-1" />Publish
          </Button>
        )}
        {isAdmin && s.status === "ACTIVE" && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleClose}>
            <Archive className="h-3 w-3 mr-1" />Close Survey
          </Button>
        )}
      </CardContent>
    </Card>
  );
});


export default function SurveysPage() {
  const { data: session } = useSession();
  const { data: surveys, isLoading } = usePulseSurveys();
  const create = useCreateSurvey();
  const update = useUpdateSurvey();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

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
      <PageWrapper title="Pulse Surveys" subtitle="Employee engagement surveys">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Pulse Surveys"
      subtitle="Create and manage employee engagement surveys"
      badge={`${surveys?.length ?? 0} surveys`}
      actions={isAdmin ? <Button size="sm" onClick={handleOpenSheet}><Plus className="h-3.5 w-3.5 mr-1" />Create Survey</Button> : undefined}
    >
      {!surveys?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyActivityIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No surveys created yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s: PulseSurvey) => (
            <SurveyCard
              key={s.id}
              s={s}
              isAdmin={isAdmin}
              onPublish={handlePublish}
              onClose={handleCloseOpen}
            />
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Survey" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Survey Title</label>
          <Input placeholder="e.g., Q1 Engagement Survey" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Closes At</label>
          <Input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">A default satisfaction question will be added. Edit questions after creation.</p>
      </HrSheet>

      <ConfirmActionDialog
        open={closeId !== null}
        onOpenChange={handleCloseDialogChange}
        title="Close Survey"
        description="Close this survey? No more responses will be accepted."
        confirmLabel="Close"
        variant="default"
        onConfirm={handleClose}
        isPending={update.isPending}
      />
    </PageWrapper>
  );
}
