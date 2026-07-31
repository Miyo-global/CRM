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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Module, ProjectMember } from "@/types/projects";

function Calendar({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function User({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function Layers({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
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

const statusColors: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
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
      <SheetContent side="right" className="sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 pb-2 shrink-0 text-left">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="pr-2 leading-snug">{mod.name}</SheetTitle>
            <Badge
              className={
                statusColors[mod.status ?? "backlog"] ?? statusColors.backlog
              }
            >
              {formatStatusLabel(mod.status ?? "backlog")}
            </Badge>
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
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {mod.startDate ? formatDateOnly(mod.startDate) : "TBD"}{" "}
                    —{" "}
                    {mod.endDate ? formatDateOnly(mod.endDate) : "TBD"}
                  </span>
                </p>
              )}
              {mod.leadId && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{leadName}</span>
                </p>
              )}
              <p className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4 shrink-0" />
                <span>
                  {mod.completedItems ?? 0} / {mod.totalItems ?? 0} work items done (
                  {mod.progress ?? 0}%)
                </span>
              </p>
              {(mod.activeTicketCount ?? 0) > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-500">
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
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit module</SheetTitle>
          <SheetDescription>Update name, dates, status, and lead.</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit((data) => onSubmit({ ...data, id: mod.id }))}
          className="flex flex-col gap-5 mt-4"
        >
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
          <Button type="submit" disabled={isPending} className="h-9 w-full">
            {isPending ? "Saving…" : "Save changes"}
          </Button>
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
                <p className="text-destructive font-medium">
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
