"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadDetail, useLeadTimeline, useUpdateLead, useUpdateLeadStatus, useLogLeadActivity } from "@/lib/api/hooks/leads";
import { useCreateTask } from "@/lib/api/hooks/tasks";
import { toast } from "sonner";

import { LeadDetailHeader } from "@/features/crm/leads/detail/lead-detail-header";
import { LeadInfoCard } from "@/features/crm/leads/detail/lead-info-card";
import { LeadQuickActions } from "@/features/crm/leads/detail/lead-quick-actions";
import { LeadSidebar } from "@/features/crm/leads/detail/lead-sidebar";
import {
  noteSchema,
  taskSchema,
  emailSchema,
  callSchema,
  editSchema,
  type QuickAction,
  type PipelineStatus,
  type NoteForm,
  type TaskForm,
  type EmailForm,
  type CallForm,
  type EditForm,
} from "@/features/crm/leads/detail/lead-types";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId: leadIdStr } = use(params);
  const leadId = Number(leadIdStr);
  const router = useRouter();

  const { data: lead, isLoading } = useLeadDetail(leadId);
  const { data: timeline, isLoading: timelineLoading } = useLeadTimeline(leadId, 50);

  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);

  const updateLeadMutation = useUpdateLead();
  const updateStatusMutation = useUpdateLeadStatus();
  const logActivityMutation = useLogLeadActivity();
  const createTaskMutation = useCreateTask();

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: lead
      ? {
          name: lead.name,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          company: lead.company ?? "",
          city: lead.city ?? "",
          priority: (lead.priority as "HOT" | "WARM" | "COLD") ?? "WARM",
          potentialValue: lead.potentialValue ?? "",
          investmentInterest: lead.investmentInterest ?? "",
          notes: lead.notes ?? "",
        }
      : undefined,
  });

  const noteForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });
  const taskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { to: lead?.email ?? "" },
  });
  const callForm = useForm<CallForm>({ resolver: zodResolver(callSchema) });

  const handleStatusChange = useCallback(
    (status: PipelineStatus) => {
      const promise = updateStatusMutation.mutateAsync({
        leadId,
        status,
        expectedStatus: lead?.status as PipelineStatus,
      });
      toast.promise(promise, {
        loading: "Updating status...",
        success: "Status updated",
        error: (err: Error) => err?.message || "Failed to update status",
      });
    },
    [leadId, updateStatusMutation, lead]
  );

  const onEditSubmit = useCallback(
    (data: EditForm) => {
      updateLeadMutation.mutate(
        { id: leadId, ...data },
        {
          onSuccess: () => { toast.success("Lead updated"); setIsEditing(false); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, updateLeadMutation]
  );

  const onNoteSubmit = useCallback(
    (data: NoteForm) => {
      logActivityMutation.mutate(
        { leadId, type: "note", date: new Date().toISOString(), notes: data.body },
        {
          onSuccess: () => { toast.success("Note added"); setActiveAction(null); noteForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation, noteForm]
  );

  const onTaskSubmit = useCallback(
    (data: TaskForm) => {
      const dueDate = data.dueDate
        ? new Date(`${data.dueDate}T09:00:00`).toISOString()
        : undefined;

      createTaskMutation.mutate(
        {
          title: data.title,
          type: "CUSTOM",
          entityType: "LEAD",
          entityId: leadId,
          dueDate,
        },
        {
          onSuccess: () => { toast.success("Task created"); setActiveAction(null); taskForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, createTaskMutation, taskForm]
  );

  const onEmailSubmit = useCallback(
    (data: EmailForm) => {
      logActivityMutation.mutate(
        { leadId, type: "email", date: new Date().toISOString(), subject: data.subject, notes: `To: ${data.to}\n\n${data.body}` },
        {
          onSuccess: () => { toast.success("Email sent"); setActiveAction(null); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation]
  );

  const handleBackToPipeline = useCallback(() => router.push("/crm/leads"), [router]);
  const handleToggleEdit = useCallback(() => setIsEditing((prev) => !prev), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleDraftEmail = useCallback(
    (subject: string, body: string) => {
      emailForm.setValue("subject", subject);
      emailForm.setValue("body", body);
      emailForm.setValue("to", lead?.email ?? "");
      setActiveAction("email");
    },
    [emailForm, lead?.email],
  );

  const onCallSubmit = useCallback(
    (data: CallForm) => {
      logActivityMutation.mutate(
        {
          leadId,
          type: "call",
          date: new Date().toISOString(),
          subject: data.subject || undefined,
          duration: data.duration ? Number(data.duration) : undefined,
          outcome: data.outcome || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => { toast.success("Call logged"); setActiveAction(null); callForm.reset(); },
          onError: (err) => toast.error(err.message),
        }
      );
    },
    [leadId, logActivityMutation, callForm]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[600px] lg:col-span-3" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={handleBackToPipeline}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>
    );
  }

  return (
    <PageWrapper
      title={lead.name}
      actions={
        <Button variant="outline" size="sm" onClick={handleBackToPipeline}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <LeadDetailHeader
            lead={lead as unknown as Parameters<typeof LeadDetailHeader>[0]["lead"]}
            isEditing={isEditing}
            onToggleEdit={handleToggleEdit}
            onStatusChange={handleStatusChange}
            isStatusPending={updateStatusMutation.isPending}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <LeadInfoCard
              lead={lead as unknown as Parameters<typeof LeadInfoCard>[0]["lead"]}
              isEditing={isEditing}
              editForm={editForm}
              isUpdatePending={updateLeadMutation.isPending}
              onEditSubmit={onEditSubmit}
              onCancelEdit={handleCancelEdit}
            />

            <LeadQuickActions
              activeAction={activeAction}
              onSetActiveAction={setActiveAction}
              noteForm={noteForm}
              taskForm={taskForm}
              emailForm={emailForm}
              callForm={callForm}
              onNoteSubmit={onNoteSubmit}
              onTaskSubmit={onTaskSubmit}
              onEmailSubmit={onEmailSubmit}
              onCallSubmit={onCallSubmit}
              isNotePending={logActivityMutation.isPending}
              isTaskPending={createTaskMutation.isPending}
              isEmailPending={logActivityMutation.isPending}
              isCallPending={logActivityMutation.isPending}
              leadName={lead.name}
              leadEmail={lead.email ?? ""}
              leadContext={[lead.status, lead.priority, lead.potentialValue].filter(Boolean).join(", ")}
              onDraftEmail={handleDraftEmail}
            />
          </div>

          <div className="lg:col-span-2">
            <LeadSidebar
              lead={lead as unknown as Parameters<typeof LeadSidebar>[0]["lead"]}
              timeline={timeline}
              timelineLoading={timelineLoading}
            />
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
