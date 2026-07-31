"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star,
  Send,
  X,
  Trash2,
  Copy,
  BarChart3,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCsatSurveys,
  useCreateCsatSurvey,
  useUpdateCsatSurvey,
  useDeleteCsatSurvey,
  useCsatSurveyResponses,
  type CsatSurvey,
  type CsatResponse,
} from "@/lib/api/hooks/crm";
import { format } from "date-fns";
import { toast } from "sonner";


function StarDisplay({ rating, max }: { rating: number; max: number }) {
  return (
    <span className="text-amber-400">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}


function StatusBadge({ status }: { status: string }) {
  if (status === "draft")
    return <Badge variant="secondary">Draft</Badge>;
  if (status === "sent")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
        Sent
      </Badge>
    );
  return (
    <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300">
      Closed
    </Badge>
  );
}


function ResultsSheet({
  survey,
  open,
  onClose,
}: {
  survey: CsatSurvey;
  open: boolean;
  onClose: () => void;
}) {
  const { data: responses = [], isLoading } = useCsatSurveyResponses(
    open ? survey.id : 0
  );

  const distribution = Array.from({ length: survey.scaleMax }, (_, i) => {
    const val = i + 1;
    const count = responses.filter((r) => r.rating === val).length;
    return { val, count };
  });

  const avgRating =
    responses.length > 0
      ? responses.reduce((s, r) => s + r.rating, 0) / responses.length
      : null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">{survey.title} — Results</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl font-bold text-foreground">
                    {avgRating !== null ? avgRating.toFixed(1) : ""}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    avg out of {survey.scaleMax} &middot; {responses.length} response
                    {responses.length !== 1 ? "s" : ""}
                  </div>
                  {avgRating !== null && (
                    <div className="mt-2 text-xl text-amber-400">
                      <StarDisplay
                        rating={Math.round(avgRating)}
                        max={survey.scaleMax}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Distribution
                  </p>
                  {distribution.map(({ val, count }) => (
                    <div key={val} className="flex items-center gap-3">
                      <span className="w-4 text-sm text-right text-muted-foreground">
                        {val}
                      </span>
                      <Progress
                        value={
                          responses.length > 0
                            ? (count / responses.length) * 100
                            : 0
                        }
                        className="flex-1 h-2"
                      />
                      <span className="w-6 text-sm text-muted-foreground text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                {responses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Responses
                    </p>
                    {responses.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-muted/30 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {r.respondentName ?? "Anonymous"}
                            {r.respondentEmail && (
                              <span className="text-muted-foreground font-normal ml-1.5">
                                &lt;{r.respondentEmail}&gt;
                              </span>
                            )}
                          </div>
                          <StarDisplay rating={r.rating} max={survey.scaleMax} />
                        </div>
                        {r.comment && (
                          <p className="text-sm text-muted-foreground">
                            {r.comment}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(r.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {responses.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No responses yet.
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


function CreateSurveySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState(
    "How satisfied are you with our service?"
  );
  const [scaleMax, setScaleMax] = useState<"5" | "10">("5");

  const create = useCreateCsatSurvey();

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        question: question.trim() || undefined,
        scaleMax: Number(scaleMax) as 5 | 10,
      });
      toast.success("Survey created");
      setTitle("");
      setQuestion("How satisfied are you with our service?");
      setScaleMax("5");
      onClose();
    } catch {
      toast.error("Failed to create survey");
    }
  }, [title, question, scaleMax, create, onClose]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">New CSAT Survey</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="csat-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="csat-title"
              placeholder="e.g. Q2 2026 Client Satisfaction"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csat-question">Survey Question</Label>
            <Textarea
              id="csat-question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csat-scale">Rating Scale</Label>
            <Select
              value={scaleMax}
              onValueChange={(v) => setScaleMax(v as "5" | "10")}
            >
              <SelectTrigger id="csat-scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">1 – 5 (default)</SelectItem>
                <SelectItem value="10">1 – 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="flex-1"
          >
            {create.isPending ? "Creating…" : "Create Survey"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


function SurveyRow({
  survey,
  onViewResults,
  onDelete,
}: {
  survey: CsatSurvey;
  onViewResults: (s: CsatSurvey) => void;
  onDelete: (s: CsatSurvey) => void;
}) {
  const update = useUpdateCsatSurvey();

  const handleSend = useCallback(async () => {
    try {
      await update.mutateAsync({ id: survey.id, status: "sent" });
      toast.success("Survey sent");
    } catch {
      toast.error("Failed to send survey");
    }
  }, [survey.id, update]);

  const handleClose = useCallback(async () => {
    try {
      await update.mutateAsync({ id: survey.id, status: "closed" });
      toast.success("Survey closed");
    } catch {
      toast.error("Failed to close survey");
    }
  }, [survey.id, update]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/surveys/${survey.id}?token=${survey.publicToken}`;
    void navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }, [survey.id, survey.publicToken]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-sm">{survey.title}</p>
            <StatusBadge status={survey.status} />
            {survey.client && (
              <span className="text-xs text-muted-foreground">
                {survey.client.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {survey.question}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 flex-wrap justify-end">
          {survey.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSend}
              disabled={update.isPending}
              className="h-7 text-xs gap-1"
            >
              <Send className="size-3" />
              Send
            </Button>
          )}
          {survey.status === "sent" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={update.isPending}
              className="h-7 text-xs gap-1"
            >
              <X className="size-3" />
              Close
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewResults(survey)}
            className="h-7 text-xs gap-1"
          >
            <BarChart3 className="size-3" />
            Results
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            aria-label="Copy survey link"
            className="h-7 w-7 p-0"
          >
            <Copy className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(survey)}
            aria-label="Delete survey"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Scale: 1–{survey.scaleMax}
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3" />
          {survey.responseCount ?? 0} response
          {(survey.responseCount ?? 0) !== 1 ? "s" : ""}
        </span>
        {survey.avgRating != null && (
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="size-3 fill-amber-400" />
            {survey.avgRating.toFixed(1)}
          </span>
        )}
        <span>
          Created {format(new Date(survey.createdAt), "MMM d, yyyy")}
        </span>
      </div>
    </motion.div>
  );
}


export default function CsatSurveysPage() {
  const { data: surveys = [], isLoading } = useCsatSurveys();

  const [createOpen, setCreateOpen] = useState(false);
  const [resultsTarget, setResultsTarget] = useState<CsatSurvey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CsatSurvey | null>(null);

  const deleteMutation = useDeleteCsatSurvey();

  const totalSurveys = surveys.length;
  const totalResponses = surveys.reduce((s, sv) => s + (sv.responseCount ?? 0), 0);
  const surveysWithAvg = surveys.filter(
    (sv) => sv.avgRating != null && (sv.responseCount ?? 0) > 0
  );
  const overallAvg =
    surveysWithAvg.length > 0
      ? surveysWithAvg.reduce((s, sv) => s + (sv.avgRating ?? 0), 0) /
        surveysWithAvg.length
      : null;

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Survey deleted");
    } catch {
      toast.error("Failed to delete survey");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  return (
    <>
      <PageWrapper
        title="CSAT Surveys"
        subtitle="Collect and analyse customer satisfaction scores"
        actions={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            New Survey
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Surveys"
              value={totalSurveys}
              icon={MessageSquare}
              color="blue"
            />
            <StatCard
              label="Avg CSAT Score"
              value={overallAvg != null ? `${overallAvg.toFixed(1)}/5` : ""}
              icon={Star}
              color="gold"
            />
            <StatCard
              label="Total Responses"
              value={totalResponses}
              icon={Users}
              color="green"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : surveys.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No surveys yet. Create your first CSAT survey.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {surveys.map((sv) => (
                  <SurveyRow
                    key={sv.id}
                    survey={sv}
                    onViewResults={setResultsTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PageWrapper>

      <CreateSurveySheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {resultsTarget && (
        <ResultsSheet
          survey={resultsTarget}
          open={!!resultsTarget}
          onClose={() => setResultsTarget(null)}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot; and
              all its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
