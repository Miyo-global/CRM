"use client";

import { use, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  useModules,
  useCreateModule,
  useProjectMembers,
  useProject,
  useUpdateModule,
  useDeleteModule,
} from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Layers, Calendar, User, Eye, Pencil, Trash2 } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Module } from "@/types/projects";
import type { ProjectMemberSelectRow } from "@/lib/projects/project-member-select";
import { ProjectMemberCombobox } from "@/features/projects/project-member-combobox";
import {
  ModulePreviewSheet,
  ModuleEditSheet,
  DeleteModuleAlert,
  canManageProjectModulesOnClient,
} from "@/features/projects/module-management-dialogs";
import { getApiError } from "@/lib/api-client";

const MODULE_STATUSES = [
  "backlog",
  "planned",
  "in-progress",
  "paused",
  "completed",
  "cancelled",
] as const;

const createModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(MODULE_STATUSES).default("backlog"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().optional(),
});
type CreateModuleForm = z.infer<typeof createModuleSchema>;

const statusColors: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function ProgressRing({ value, size = 40 }: { value: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

export default function ModulesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewModule, setPreviewModule] = useState<Module | null>(null);
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [deleteModule, setDeleteModule] = useState<Module | null>(null);

  const { data: session } = useSession();
  const { data: modules, isLoading } = useModules(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: project } = useProject(projectId);

  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();
  const deleteMutation = useDeleteModule();

  const canManage = canManageProjectModulesOnClient({
    userId: session?.user?.id,
    orgRole: session?.user?.role,
    managerId: project?.managerId,
    members,
  });

  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema) as unknown as Resolver<CreateModuleForm>,
    defaultValues: { status: "backlog" },
  });

  const handleSetStartDate = useCallback(
    (v: string) => form.setValue("startDate", v),
    [form],
  );
  const handleSetEndDate = useCallback(
    (v: string) => form.setValue("endDate", v),
    [form],
  );
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const onSubmit = (data: CreateModuleForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset();
          toast.success("Module created");
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  };

  const handleEditSubmit = (data: {
    id: number;
    name: string;
    description?: string;
    status: (typeof MODULE_STATUSES)[number];
    startDate?: string;
    endDate?: string;
    leadId?: string;
  }) => {
    updateMutation.mutate(
      {
        projectId,
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        leadId: data.leadId ? data.leadId : null,
      },
      {
        onSuccess: () => {
          setEditModule(null);
          toast.success("Module updated");
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteModule) return;
    deleteMutation.mutate(
      { projectId, moduleId: deleteModule.id },
      {
        onSuccess: () => {
          setDeleteModule(null);
          toast.success("Module deleted");
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  };

  if (isLoading) {
    return (
      <PageWrapper title="Modules">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Modules"
      actions={
        canManage ? (
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Module
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create Module</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mod-name">Name</Label>
                  <Input id="mod-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-desc">Description</Label>
                  <Textarea
                    id="mod-desc"
                    rows={3}
                    className="min-h-[4.5rem] resize-y"
                    {...form.register("description")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-status">Status</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="mod-status" className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODULE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-0">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="mod-start">Start Date</Label>
                    <DatePicker
                      id="mod-start"
                      value={form.watch("startDate") || ""}
                      onChange={handleSetStartDate}
                      placeholder="Start date"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="mod-end">End Date</Label>
                    <DatePicker
                      id="mod-end"
                      value={form.watch("endDate") || ""}
                      onChange={handleSetEndDate}
                      placeholder="End date"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-lead">Lead</Label>
                  <Controller
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <ProjectMemberCombobox
                        id="mod-lead"
                        members={(members ?? []) as ProjectMemberSelectRow[]}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        placeholder="Select lead..."
                        disabled={createMutation.isPending}
                        clearLabel="No lead"
                      />
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="mt-1 h-9 w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create Module"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        ) : null
      }
    >
      <div>
        <ModulePreviewSheet
          module={previewModule}
          projectId={projectId}
          members={members}
          open={!!previewModule}
          onOpenChange={(open) => {
            if (!open) setPreviewModule(null);
          }}
        />
        <ModuleEditSheet
          module={editModule}
          members={members}
          open={!!editModule}
          onOpenChange={(open) => {
            if (!open) setEditModule(null);
          }}
          isPending={updateMutation.isPending}
          onSubmit={handleEditSubmit}
        />
        <DeleteModuleAlert
          module={deleteModule}
          open={!!deleteModule}
          onOpenChange={(open) => {
            if (!open) setDeleteModule(null);
          }}
          isPending={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
        />

        {!modules?.length ? (
          <div className="flex flex-col items-center gap-3">
            <EmptyState
              illustration={<EmptyTasksIllustration className="h-32 w-32 opacity-95" />}
              title="No modules yet"
              description="Create your first module to organize work into feature areas."
              action={
                canManage
                  ? { label: "Create First Module", onClick: handleOpenCreate }
                  : undefined
              }
            />
            {!canManage && (
              <p className="text-xs text-muted-foreground">
                Ask a project admin to create a module.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Card key={mod.id} className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">
                      {mod.name}
                    </CardTitle>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Preview module"
                        onClick={() => setPreviewModule(mod)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Edit module"
                            onClick={() => setEditModule(mod)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Delete module"
                            onClick={() => setDeleteModule(mod)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={
                      statusColors[mod.status ?? "backlog"] ?? statusColors.backlog
                    }
                  >
                    {(mod.status ?? "backlog")
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex items-center gap-4 flex-1">
                    <ProgressRing value={mod.progress ?? 0} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {mod.progress ?? 0}% complete
                      </p>
                      {(mod.startDate || mod.endDate) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {mod.startDate
                            ? new Date(
                                typeof mod.startDate === "string"
                                  ? mod.startDate.slice(0, 10)
                                  : mod.startDate,
                              ).toLocaleDateString()
                            : "TBD"}{" "}
                          —{" "}
                          {mod.endDate
                            ? new Date(
                                typeof mod.endDate === "string"
                                  ? mod.endDate.slice(0, 10)
                                  : mod.endDate,
                              ).toLocaleDateString()
                            : "TBD"}
                        </p>
                      )}
                      {mod.leadId && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          Lead assigned
                        </p>
                      )}
                    </div>
                    <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
