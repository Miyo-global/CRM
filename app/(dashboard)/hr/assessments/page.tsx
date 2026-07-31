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
import { Plus, ClipboardCheck, Clock, Users, PlayCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

interface Assessment {
  id: number; title: string; description: string | null; category: string | null;
  durationMinutes: number | null; status: string | null; questionCount: number;
  completedCount: number; createdAt: string | null;
}

const assessKeys = { all: [...queryKeys.hr.all, "assessments"] as const, list: () => [...assessKeys.all, "list"] as const };

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "PUBLISHED") return "default";
  if (s === "DRAFT") return "secondary";
  return "outline";
}

export default function AssessmentsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

  const { data: items, isLoading } = useQuery({
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
      <PageWrapper title="Assessments" subtitle="Skills assessments and quizzes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills Assessments"
      subtitle="Create and take skill assessment quizzes"
      badge={`${items?.length ?? 0} assessments`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Create Assessment</Button> : undefined}
    >
      {!items?.length ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
          title="No assessments available"
          description="Published skill assessments and quizzes will appear here."
          {...(isAdmin ? { action: { label: "Create Assessment", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a: Assessment) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Badge variant={statusBadge(a.status)} className="text-[10px]">{a.status ?? "DRAFT"}</Badge>
                  {a.category && <span className="text-[10px] text-muted-foreground">{a.category}</span>}
                </div>
                <h3 className="text-sm font-semibold leading-tight">{a.title}</h3>
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {a.durationMinutes && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{a.durationMinutes} min</span>}
                  <span className="flex items-center gap-0.5"><ClipboardCheck className="h-3 w-3" />{a.questionCount} questions</span>
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{a.completedCount} completed</span>
                </div>
                {a.status === "PUBLISHED" && (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                    <PlayCircle className="h-3 w-3 mr-1" />Take Assessment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Assessment" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
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
