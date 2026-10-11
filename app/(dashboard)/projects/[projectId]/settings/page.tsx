"use client";

import { use, useState, useMemo, useCallback, useRef } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from "@/lib/api/hooks/projects";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { NotFoundIllustration } from "@/components/illustrations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateProjectSettingsInputSchema } from "@/lib/validations/project";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronsUpDown,
  User,
  AlertTriangle,
  Settings,
  Users,
  Trash2,
  UserX,
  Search,
} from "lucide-react";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { useSession } from "next-auth/react";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

export default function ProjectSettingsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const deleteMutation = useDeleteProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "ACTIVE",
    },
    values: project
      ? {
          name: project.name || "",
          description: project.description || "",
          status:
            (project.status as "ACTIVE" | "COMPLETED" | "ARCHIVED") ||
            "ACTIVE",
          memberIds:
            project.members?.map((m: { userId: string }) => m.userId) || [],
        }
      : undefined,
  });

  const updateMutation = useUpdateProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [reassignDialog, setReassignDialog] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("__unassign__");
  const reassignmentsRef = useRef<Record<string, string>>({});
  const pendingFieldChangeRef = useRef<(() => void) | null>(null);

  const handleMemberRemoved = useCallback(
    (memberId: string, memberName: string, applyChange: () => void) => {
      setReassignTo("__unassign__");
      pendingFieldChangeRef.current = applyChange;
      setReassignDialog({ memberId, memberName });
    },
    []
  );

  const confirmReassign = useCallback(() => {
    if (!reassignDialog) return;
    if (reassignTo && reassignTo !== "__unassign__") {
      reassignmentsRef.current[reassignDialog.memberId] = reassignTo;
    } else {
      delete reassignmentsRef.current[reassignDialog.memberId];
    }
    pendingFieldChangeRef.current?.();
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, [reassignDialog, reassignTo]);

  const cancelReassign = useCallback(() => {
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    deleteMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast.success("Project deleted successfully");
          router.push("/projects");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [deleteMutation, projectId, router]);

  if (isLoading) {
    return (
      <PageWrapper title="Settings">
        <div className="max-w-4xl space-y-6 pb-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Settings">
        <QueryErrorState error={error} onRetry={refetch} />
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper title="Settings">
        <div role="alert">
          <EmptyState
            illustration={<NotFoundIllustration className="h-32 w-32 opacity-95" />}
            title="Project not found"
            description="The requested project could not be loaded."
          />
        </div>
      </PageWrapper>
    );
  }

  const isOwner = session?.user?.role === "CEO";
  const canEdit =
    isAdminOrOwner(session?.user?.role) ||
    (!!session?.user?.id && project.managerId === session.user.id);

  const onSubmit = (values: FormValues) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit this project.");
      return;
    }
    const reassignments =
      Object.keys(reassignmentsRef.current).length > 0
        ? { ...reassignmentsRef.current }
        : undefined;
    updateMutation.mutate(
      { projectId, ...values, ...(reassignments && { reassignments }) },
      {
        onSuccess: () => {
          reassignmentsRef.current = {};
          toast.success("Project settings updated");
          router.push(`/projects/${projectId}`);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  return (
    <PageWrapper
      title="Settings"
      subtitle={project.name}
    >
      <div className="w-full max-w-4xl space-y-6 pb-8">
        <Card>
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <IconChip icon={Settings} tone="neutral" size="sm" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">General</h2>
              {!canEdit && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  You have read-only access. Only project managers and admins can
                  edit these settings.
                </p>
              )}
            </div>
          </div>

          <fieldset disabled={!canEdit} className="contents">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="divide-y divide-border px-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-6">
                      <FormLabel className="sm:pt-2">Project Name</FormLabel>
                      <div className="grid min-w-0 gap-1.5">
                        <FormControl>
                          <Input {...field} placeholder="Enter project name" />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="grid gap-2 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-6">
                      <FormLabel className="sm:pt-2">Description</FormLabel>
                      <div className="grid min-w-0 gap-1.5">
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Project description"
                            className="min-h-20 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="grid gap-2 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-6">
                      <FormLabel className="sm:pt-2">Status</FormLabel>
                      <div className="grid min-w-0 gap-1.5">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-6">
                  <div className="flex items-center gap-2 text-sm font-medium sm:pt-2">
                    <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                    Team Members
                  </div>
                  <div className="min-w-0">
                    <MembersSelector
                      form={form}
                      originalMemberIds={
                        project.members?.map((m: { userId: string }) => m.userId) ?? []
                      }
                      onMemberRemoved={handleMemberRemoved}
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-border bg-card/90 px-5 py-3 backdrop-blur">
                {form.formState.isDirty && (
                  <span className="mr-auto text-xs text-warning-strong">Unsaved changes</span>
                )}
                <Button
                  type="submit"
                  loading={updateMutation.isPending}
                  className="w-full sm:w-auto sm:min-w-40"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
          </fieldset>
        </Card>

        {isOwner && (
          <Card className="border-danger-soft">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-lg font-semibold text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <h2>Danger Zone</h2>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Delete Project</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Deleting a project is irreversible. It will remove all
                  tickets, sprints, and associated data.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => setDeleteDialogOpen(true)}
                loading={deleteMutation.isPending}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete Project
              </Button>
            </div>
            <ConfirmDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              title="Are you absolutely sure?"
              description={`This action cannot be undone. This will permanently delete "${project.name}" and remove all associated data.`}
              confirmLabel={
                deleteMutation.isPending ? "Deleting..." : "Delete Project"
              }
              destructive
              onConfirm={handleDeleteConfirm}
            />
          </Card>
        )}
      </div>

      <ReassignDialog
        open={reassignDialog !== null}
        memberName={reassignDialog?.memberName ?? ""}
        removedMemberId={reassignDialog?.memberId ?? ""}
        currentMemberIds={form.getValues("memberIds") ?? []}
        reassignTo={reassignTo}
        onReassignToChange={setReassignTo}
        onConfirm={confirmReassign}
        onCancel={cancelReassign}
      />
    </PageWrapper>
  );
}

interface ReassignDialogProps {
  open: boolean;
  memberName: string;
  removedMemberId: string;
  currentMemberIds: string[];
  reassignTo: string;
  onReassignToChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function ReassignDialog({
  open,
  memberName,
  removedMemberId,
  currentMemberIds,
  reassignTo,
  onReassignToChange,
  onConfirm,
  onCancel,
}: ReassignDialogProps) {
  const { data: employeesData } = useHrEmployees();
  const employees = Array.isArray(employeesData)
    ? employeesData
    : (employeesData?.data ?? []);

  const remainingMembers = employees.filter(
    (emp) =>
      currentMemberIds.includes(emp.id) && emp.id !== removedMemberId
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserX className="size-4 text-warning-strong" aria-hidden="true" />
            Reassign open tickets
          </SheetTitle>
          <SheetDescription>
            <strong>{memberName}</strong> has open tickets in this project.
            Choose a team member to reassign them to, or leave them unassigned.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 py-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reassign to
          </p>
          <Select value={reassignTo} onValueChange={onReassignToChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassign__">
                <span className="text-muted-foreground">Leave unassigned</span>
              </SelectItem>
              {remainingMembers.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name || emp.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel removal
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MembersSelector({
  form,
  originalMemberIds,
  onMemberRemoved,
}: {
  form: UseFormReturn<FormValues>;
  originalMemberIds: string[];
  onMemberRemoved: (memberId: string, memberName: string, applyChange: () => void) => void;
}) {
  const { data: employeesData } = useHrEmployees();
  const employees = Array.isArray(employeesData)
    ? employeesData
    : (employeesData?.data ?? []);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = useMemo(
    () =>
      employees?.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [employees, searchQuery]
  );

  return (
    <FormField
      control={form.control}
      name="memberIds"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Popover onOpenChange={(open) => { if (!open) setSearchQuery(""); }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  role="combobox"
                >
                  {field.value?.length && field.value.length > 0
                    ? `${field.value.length} member${field.value.length > 1 ? "s" : ""} selected`
                    : "Select members"}
                  <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="flex max-h-[60vh] w-(--radix-popover-trigger-width) flex-col overflow-hidden p-2"
                align="start"
                collisionPadding={16}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8"
                    aria-label="Search team members"
                  />
                </div>
                <div
                  className="flex-1 min-h-0 overflow-y-auto space-y-0.5 overscroll-contain"
                  onWheelCapture={(e) => e.stopPropagation()}
                >
                  {filteredEmployees?.map((emp) => {
                    const selected = field.value?.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent focus-visible:focus-ring"
                        onClick={() => {
                          const current = field.value || [];
                          if (selected) {
                            const applyRemoval = () =>
                              field.onChange(current.filter((id: string) => id !== emp.id));
                            if (originalMemberIds.includes(emp.id)) {
                              onMemberRemoved(emp.id, emp.name ?? emp.email ?? emp.id, applyRemoval);
                            } else {
                              applyRemoval();
                            }
                          } else {
                            field.onChange([...current, emp.id]);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selected}
                          tabIndex={-1}
                          className="pointer-events-none"
                          aria-hidden
                        />
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-3xs font-semibold text-brand-soft-foreground">
                          {emp.name?.charAt(0) || (
                            <User className="size-3" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {emp.name}
                          </p>
                          <p className="text-2xs text-muted-foreground truncate">
                            {emp.email}
                          </p>
                        </div>
                        {selected && (
                          <Check className="size-4 shrink-0 text-brand-text" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                  {!filteredEmployees?.length && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No employees found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
