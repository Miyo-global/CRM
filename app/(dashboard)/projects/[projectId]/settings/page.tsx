"use client";

import { use, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateProjectSettingsInputSchema } from "@/lib/validations/project";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Settings, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectMembersSection } from "@/features/projects/members/project-members-section";
import { WipLimitsSection } from "@/features/projects/settings/wip-limits-section";
import { ClientAccessSection } from "@/features/projects/client-portal/client-access-section";

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
        }
      : undefined,
  });

  const updateMutation = useUpdateProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    deleteMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast.success("Deleted the project");
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
            title="Project not found"
            description="The requested project could not be loaded."
          />
        </div>
      </PageWrapper>
    );
  }

  const isOwner = session?.user?.role === "CEO";
  const canEdit = project.viewerRole === "OWNER" || project.viewerRole === "MANAGER";

  const onSubmit = (values: FormValues) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit this project.");
      return;
    }
    updateMutation.mutate(
      { projectId, ...values },
      {
        onSuccess: () => {
          toast.success("Saved the project settings");
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
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
          </fieldset>
        </Card>

        <ProjectMembersSection project={project} />

        <WipLimitsSection projectId={projectId} statuses={project.statuses ?? []} canManage={canEdit} />

        <ClientAccessSection projectId={projectId} canManage={canEdit} />

        {isOwner && (
          <Card className="border-danger-soft">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-lg font-semibold text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <h2>Danger Zone</h2>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Delete project</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Removes the project and its tickets from every list. An
                  organization owner can restore it from the deleted projects list.
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
                Delete project
              </Button>
            </div>
            <ConfirmDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              title={`Delete ${project.name}?`}
              description="The project, its tickets and comments leave every list. An organization owner can restore them later."
              confirmLabel="Delete project"
              destructive
              onConfirm={handleDeleteConfirm}
            />
          </Card>
        )}
      </div>

    </PageWrapper>
  );
}
