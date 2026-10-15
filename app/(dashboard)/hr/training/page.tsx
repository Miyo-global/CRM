"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useTrainingPrograms, useCreateTrainingProgram, useUpdateTrainingProgram, useDeleteTrainingProgram, useEnrollInProgram, type TrainingProgram } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, MoreHorizontal, BookOpen, Users, Calendar, Clock,
  Trash2, Play, Archive, UserPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";
import { isAdminOrOwner } from "@/lib/constants/roles";

function statusTone(status: string | null): Tone {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "neutral";
  return "warning";
}

export default function TrainingPage() {
  const { data: session } = useSession();
  const { data: programs, isLoading, isError, error, refetch } = useTrainingPrograms();
  const createProgram = useCreateTrainingProgram();
  const updateProgram = useUpdateTrainingProgram();
  const deleteProgram = useDeleteTrainingProgram();
  const enroll = useEnrollInProgram();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("");
  const [instructor, setInstructor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isAdmin = isAdminOrOwner(session?.user?.role);

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    createProgram.mutate({
      title: title.trim(),
      description: description || undefined,
      category: category || undefined,
      duration: duration || undefined,
      instructor: instructor || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }, {
      onSuccess: () => {
        toast.success("Program created");
        setSheetOpen(false);
        setTitle(""); setDescription(""); setCategory(""); setDuration("");
        setInstructor(""); setStartDate(""); setEndDate("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [title, description, category, duration, instructor, startDate, endDate, createProgram]);

  const handlePublish = useCallback((id: number) => {
    updateProgram.mutate({ id, status: "PUBLISHED" }, {
      onSuccess: () => toast.success("Program published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateProgram]);

  const handleArchive = useCallback((id: number) => {
    updateProgram.mutate({ id, status: "ARCHIVED" }, {
      onSuccess: () => toast.success("Program archived"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateProgram]);

  const handleEnroll = useCallback((programId: number) => {
    enroll.mutate({ programId }, {
      onSuccess: () => toast.success("Enrolled successfully"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [enroll]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteProgram.mutate(deleteId, {
      onSuccess: () => { toast.success("Program deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteProgram]);

  if (isLoading) {
    return (
      <PageWrapper title="Training">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Training & development"
      badge={`${programs?.length ?? 0} programs`}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />New Program
          </Button>
        ) : undefined
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !programs?.length ? (
        <EmptyState
          title="No training programs yet"
          description="Programs, courses, and certifications will appear here."
          {...(isAdmin ? { action: { label: "New Program", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {programs.map((program: TrainingProgram) => {
            const enrolled = program.enrollments?.length ?? 0;
            const isUserEnrolled = program.enrollments?.some((e) => e.userId === session?.user?.id);
            return (
              <Card key={program.id}>
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconChip icon={BookOpen} tone="brand" />
                      <StatusPill tone={statusTone(program.status)} dot>{program.status}</StatusPill>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Program actions"><MoreHorizontal className="size-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {program.status === "DRAFT" && <DropdownMenuItem onClick={() => handlePublish(program.id)}><Play className="h-3.5 w-3.5 mr-1.5" />Publish</DropdownMenuItem>}
                          {program.status === "PUBLISHED" && <DropdownMenuItem onClick={() => handleArchive(program.id)}><Archive className="h-3.5 w-3.5 mr-1.5" />Archive</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(program.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{program.title}</h3>
                    {program.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{program.description}</p>}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                    {program.category && <span className="flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden="true" />{program.category}</span>}
                    {program.duration && <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{program.duration}</span>}
                    {program.startDate && <span className="flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />{format(new Date(program.startDate), "MMM d")}</span>}
                    <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{enrolled} enrolled</span>
                  </div>

                  {program.status === "PUBLISHED" && !isUserEnrolled && (
                    <Button size="sm" variant="outline" className="mt-auto w-full" onClick={() => handleEnroll(program.id)} loading={enroll.isPending && enroll.variables?.programId === program.id}>
                      <UserPlus className="size-4" aria-hidden="true" />Enroll
                    </Button>
                  )}
                  {isUserEnrolled && (
                    <Badge variant="success" dot className="mt-auto w-full justify-center">Enrolled</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create training program" onSubmit={handleCreate} submitLabel="Create" isPending={createProgram.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., React Advanced Workshop" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Program details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Input placeholder="e.g., Technical" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration</label>
            <Input placeholder="e.g., 2 hours" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Instructor</label>
          <Input placeholder="Instructor name" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete program"
        description="Are you sure? All enrollments will also be removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteProgram.isPending}
      />
    </PageWrapper>
  );
}
