"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { HrSheet } from "@/features/hr/hr-sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, ClipboardList } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { CareerEvaluation, CareerLadder, CareerReadinessStatus } from "@/types/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";

const evalKeys = {
  list: () => ["hr", "career-evaluations", "list"] as const,
};
const ladderKeys = {
  list: () => ["hr", "career-ladders", "list"] as const,
};

const READINESS_OPTIONS: { value: CareerReadinessStatus; label: string }[] = [
  { value: "NOT_READY", label: "Not Ready" },
  { value: "DEVELOPING", label: "Developing" },
  { value: "READY_SOON", label: "Ready Soon" },
  { value: "RECOMMENDED", label: "Recommended" },
];

const READINESS_BADGE: Record<CareerReadinessStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NOT_READY: { label: "Not Ready", variant: "destructive" },
  DEVELOPING: { label: "Developing", variant: "secondary" },
  READY_SOON: { label: "Ready Soon", variant: "outline" },
  RECOMMENDED: { label: "Recommended", variant: "default" },
};

const EMPTY_FORM = {
  employeeUserId: "",
  ladderId: "",
  level: "",
  readinessStatus: "DEVELOPING" as CareerReadinessStatus,
  strengths: "",
  areasToGrow: "",
  notes: "",
};

export default function CareerEvaluationsPage() {
  const { data: session } = useSession();
  const isAdmin = ["CEO", "HR", "ADMIN"].includes(session?.user?.role ?? "");
  const qc = useQueryClient();

  const { data: evaluations, isLoading } = useQuery({
    queryKey: evalKeys.list(),
    queryFn: () => apiClient.get<CareerEvaluation[]>("/hr/career-evaluations"),
  });

  const { data: laddersRaw } = useQuery({
    queryKey: ladderKeys.list(),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders"),
  });

  const { data: employeesRaw } = useHrEmployees({ limit: 200 });

  const employees = useMemo(() => {
    const raw = employeesRaw as { data?: Employee[]; items?: Employee[] } | Employee[] | undefined;
    const list: Employee[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
    return list.map((e) => ({
      value: e.id,
      label: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id,
    }));
  }, [employeesRaw]);

  const ladders: CareerLadder[] = Array.isArray(laddersRaw) ? laddersRaw : [];

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const createEval = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<CareerEvaluation>("/hr/career-evaluations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: evalKeys.list() }),
  });

  const handleCreate = useCallback(() => {
    if (!form.employeeUserId) { toast.error("Select an employee"); return; }
    createEval.mutate(
      {
        employeeUserId: form.employeeUserId,
        ladderId: form.ladderId ? parseInt(form.ladderId) : null,
        level: form.level ? parseInt(form.level) : null,
        readinessStatus: form.readinessStatus,
        strengths: form.strengths.trim() || null,
        areasToGrow: form.areasToGrow.trim() || null,
        notes: form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Evaluation submitted");
          setAddOpen(false);
          setForm(EMPTY_FORM);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, createEval]);

  const rows: CareerEvaluation[] = Array.isArray(evaluations) ? evaluations : [];

  if (isLoading) {
    return (
      <PageWrapper title="Career Evaluations" subtitle="Manager readiness assessments">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Career Evaluations"
      subtitle="Assess employee readiness for promotion"
      badge={`${rows.length} evaluations`}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Evaluation
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Ladder / Level</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Strengths</TableHead>
                  <TableHead>Areas to Grow</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ClipboardList className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No evaluations yet.</p>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            New Evaluation
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((ev) => {
                    const badge = READINESS_BADGE[ev.readinessStatus];
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm font-medium">{ev.employeeName ?? ev.employeeUserId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ev.ladderTitle ? (
                            <span>{ev.ladderTitle}{ev.level ? ` · L${ev.level}` : ""}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                          <p className="line-clamp-2">{ev.strengths ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                          <p className="line-clamp-2">{ev.areasToGrow ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ev.evaluatedAt ? format(new Date(ev.evaluatedAt), "dd MMM yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <HrSheet
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(EMPTY_FORM); }}
        title="New Evaluation"
        description="Submit a readiness assessment for an employee."
        onSubmit={handleCreate}
        submitLabel="Submit Evaluation"
        isPending={createEval.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
            <SearchableSelect
              options={employees}
              value={form.employeeUserId}
              onValueChange={(v) => setForm((f) => ({ ...f, employeeUserId: v }))}
              placeholder="Select employee"
              searchPlaceholder="Search employees…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Career Ladder</label>
            <SearchableSelect
              options={[{ value: "", label: "No ladder" }, ...ladders.map((l) => ({ value: String(l.id), label: l.title }))]}
              value={form.ladderId}
              onValueChange={(v) => setForm((f) => ({ ...f, ladderId: v }))}
              placeholder="Select ladder"
              searchPlaceholder="Search…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Level</label>
            <SearchableSelect
              options={[
                { value: "", label: "Not specified" },
                ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Level ${i + 1}` })),
              ]}
              value={form.level}
              onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
              placeholder="Select level"
              searchPlaceholder="Search…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Readiness Status <span className="text-destructive">*</span></label>
            <SearchableSelect
              options={READINESS_OPTIONS}
              value={form.readinessStatus}
              onValueChange={(v) => setForm((f) => ({ ...f, readinessStatus: v as CareerReadinessStatus }))}
              placeholder="Select readiness"
              searchPlaceholder="Search…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Strengths</label>
            <Textarea
              value={form.strengths}
              onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
              placeholder="Key strengths demonstrated…"
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Areas to Grow</label>
            <Textarea
              value={form.areasToGrow}
              onChange={(e) => setForm((f) => ({ ...f, areasToGrow: e.target.value }))}
              placeholder="What needs to improve before promotion…"
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional context…"
              rows={2}
              maxLength={2000}
            />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
