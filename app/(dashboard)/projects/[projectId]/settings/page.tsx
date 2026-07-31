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
import { Card, CardContent } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";

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

  const { data: project, isLoading } = useProject(projectId);
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
        <div className="max-w-xl mx-auto space-y-6 pb-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper title="Settings">
        <div className="flex items-center justify-center h-64" role="alert">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-destructive">
              Project not found
            </h2>
            <p className="text-sm text-muted-foreground">
              The requested project could not be loaded.
            </p>
          </div>
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
      <div className="mx-auto w-full max-w-3xl space-y-6 px-3 pb-8 sm:px-4 lg:px-0">

        <Card>
          <CardContent className="space-y-5 p-4 pt-5 sm:p-6 sm:pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4 text-muted-foreground" />
              General
            </div>
            <Separator />

            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                You have read-only access. Only project managers and admins can
                edit these settings.
              </p>
            )}

            <fieldset disabled={!canEdit} className="contents">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 sm:space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter project name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Project description"
                          className="min-h-[80px] resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                    </FormItem>
                  )}
                />

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team Members
                  </div>
                  <MembersSelector
                    form={form}
                    originalMemberIds={
                      project.members?.map((m: { userId: string }) => m.userId) ?? []
                    }
                    onMemberRemoved={handleMemberRemoved}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full sm:w-auto sm:min-w-40"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
            </fieldset>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-destructive/30">
            <CardContent className="space-y-4 p-4 pt-5 sm:p-6 sm:pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </div>
              <Separator />
              <div className="rounded-md border border-destructive/25 bg-destructive/5 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Deleting a project is irreversible. It will remove all
                  tickets, sprints, and associated data.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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
            </CardContent>
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
            <UserX className="h-4 w-4 text-amber-500" />
            Reassign open tickets
          </SheetTitle>
          <SheetDescription>
            <strong>{memberName}</strong> has open tickets in this project.
            Choose a team member to reassign them to, or leave them unassigned.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 py-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-2 max-h-[60vh] overflow-hidden flex flex-col"
                align="start"
                collisionPadding={16}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
                        className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left"
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
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium shrink-0">
                          {emp.name?.charAt(0) || (
                            <User className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {emp.email}
                          </p>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {!filteredEmployees?.length && (
                    <p className="text-sm text-center py-4 text-muted-foreground">
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
