"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar, Layers, User } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Module, ProjectMember } from "@/types/projects";

import type { ProjectMemberSelectRow } from "@/lib/projects/project-member-select";
import { ProjectMemberCombobox } from "@/features/projects/project-member-combobox";
import { isExpenseAdmin } from "@/lib/constants/roles";

const MODULE_STATUSES = [
  "backlog",
  "planned",
  "in-progress",
  "paused",
  "completed",
  "cancelled",
] as const;

const statusTones: Record<string, Tone> = {
  backlog: "neutral",
  planned: "info",
  "in-progress": "brand",
  paused: "warning",
  completed: "success",
  cancelled: "danger",
};

const PROJECT_MODULE_MANAGER_ROLES = ["ADMIN", "MANAGER", "OWNER"] as const;

export function canManageProjectModulesOnClient(input: {
  userId?: string | null;
  orgRole?: string | null;
  managerId?: string | null | undefined;
  members: ProjectMember[] | undefined;
}): boolean {
  if (isExpenseAdmin(input.orgRole)) return true;
  if (input.managerId && input.userId && input.managerId === input.userId) return true;
  const m = input.members?.find((x) => x.userId === input.userId);
  const r = m?.role?.toUpperCase() ?? "";
  return PROJECT_MODULE_MANAGER_ROLES.some((allowed) => r === allowed);
}

function isoDateOnly(v: string | Date | null | undefined): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.length >= 10 ? v.slice(0, 10) : v;
  try {
    return new Date(v as Date).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatDateOnly(v: string | Date | null | undefined): string {
  const iso = isoDateOnly(v);
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString();
}

function memberDisplayName(members: ProjectMember[] | undefined, userId: string | null) {
  if (!userId) return null;
  const row = members?.find((m) => m.userId === userId);
  const u = row?.user;
  if (!u) return "Assigned";
  const fromParts = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return u.name || fromParts || u.email || "Assigned";
}

function formatStatusLabel(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModulePreviewSheet(props: {
  module: Module | null;
  projectId: number;
  members: ProjectMember[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { module: mod, projectId, members, open, onOpenChange } = props;
  if (!mod) return null;

  const leadName = memberDisplayName(members, mod.leadId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md" className="gap-0 p-0">
        <SheetHeader className="shrink-0 pt-6 pb-2 pl-6 text-left">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="pr-2 leading-snug">{mod.name}</SheetTitle>
            <StatusPill tone={statusTones[mod.status ?? "backlog"] ?? "neutral"} dot className="shrink-0">
              {formatStatusLabel(mod.status ?? "backlog")}
            </StatusPill>
          </div>
          <SheetDescription className="sr-only">Module details</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 pb-6 space-y-4">
            {mod.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {mod.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description</p>
            )}
            <div className="space-y-2 text-sm">
              {(mod.startDate || mod.endDate) && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">
                    {mod.startDate ? formatDateOnly(mod.startDate) : "TBD"}{" "}
                    —{" "}
                    {mod.endDate ? formatDateOnly(mod.endDate) : "TBD"}
                  </span>
                </p>
              )}
              {mod.leadId && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{leadName}</span>
                </p>
              )}
              <p className="flex items-center gap-2 text-muted-foreground">
                <Layers className="size-4 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">
                  {mod.completedItems ?? 0} / {mod.totalItems ?? 0} work items done (
                  {mod.progress ?? 0}%)
                </span>
              </p>
              {(mod.activeTicketCount ?? 0) > 0 && (
                <p className="text-xs text-warning-strong">
                  {mod.activeTicketCount} open work item
                  {(mod.activeTicketCount ?? 0) === 1 ? "" : "s"} in non-terminal
                  states.
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/projects/${projectId}`}>Go to project</Link>
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

const editModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(MODULE_STATUSES),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after the start date",
      path: ["endDate"],
    });
  }
});
type EditModuleForm = z.infer<typeof editModuleSchema>;

export function ModuleEditSheet(props: {
  module: Module | null;
  members: ProjectMember[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (data: EditModuleForm & { id: number }) => void;
}) {
  const { module: mod, members, open, onOpenChange, isPending, onSubmit } = props;

  const form = useForm<EditModuleForm>({
    resolver: zodResolver(editModuleSchema) as unknown as Resolver<EditModuleForm>,
    defaultValues: {
      name: "",
      description: "",
      status: "backlog",
      startDate: "",
      endDate: "",
      leadId: "",
    },
  });

  useEffect(() => {
    if (!mod || !open) return;
    form.reset({
      name: mod.name,
      description: mod.description ?? "",
      status: (mod.status as EditModuleForm["status"]) ?? "backlog",
      startDate: isoDateOnly(mod.startDate),
      endDate: isoDateOnly(mod.endDate),
      leadId: mod.leadId ?? "",
    });
  }, [mod, open, form]);

  if (!mod) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="md" className="gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border pl-6">
          <SheetTitle>Edit module</SheetTitle>
          <SheetDescription>Update name, dates, status, and lead.</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit((data) => onSubmit({ ...data, id: mod.id }))}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-mod-name">Name</Label>
              <Input id="edit-mod-name" {...form.register("name")} disabled={isPending} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mod-desc">Description</Label>
              <Textarea
                id="edit-mod-desc"
                rows={3}
                className="min-h-[4.5rem] resize-y"
                {...form.register("description")}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mod-status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger id="edit-mod-status" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-0">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="edit-mod-start">Start date</Label>
                <DatePicker
                  id="edit-mod-start"
                  value={form.watch("startDate") || ""}
                  onChange={(v) => form.setValue("startDate", v)}
                  placeholder="Start date"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="edit-mod-end">End date</Label>
                <DatePicker
                  id="edit-mod-end"
                  value={form.watch("endDate") || ""}
                  onChange={(v) => form.setValue("endDate", v)}
                  placeholder="End date"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mod-lead">Lead</Label>
              <Controller
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <ProjectMemberCombobox
                    id="edit-mod-lead"
                    members={(members ?? []) as ProjectMemberSelectRow[]}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Select lead..."
                    disabled={isPending}
                    clearLabel="No lead"
                  />
                )}
              />
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 bg-surface-raised/90 backdrop-blur">
            <Button type="submit" loading={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteModuleAlert(props: {
  module: Module | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const { module: mod, open, onOpenChange, isPending, onConfirm } = props;
  const active = mod?.activeTicketCount ?? 0;
  const blocked = active > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete module?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This will permanently remove{" "}
                <span className="font-medium text-foreground">{mod?.name}</span> from
                the project. Any remaining linked work items will have their module
                cleared.
              </p>
              {blocked && (
                <p className="font-medium text-danger-strong">
                  This module has {active} open work item{active === 1 ? "" : "s"}. Resolve
                  or reassign them before deleting.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || blocked || !mod}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              if (!blocked && mod) onConfirm();
            }}
          >
            {isPending ? "Deleting…" : "Delete module"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
