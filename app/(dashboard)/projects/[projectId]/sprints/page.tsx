"use client";

import { use, useState, useCallback } from "react";
import {
  useSprints, useProject, useUpdateSprint, useUpdateTicket,
} from "@/lib/api/hooks/projects";
import { CreateSprintDialog } from "@/components/projects/create-sprint-dialog";
import { BurndownChart } from "@/components/projects/burndown-chart";
import { VelocityChart } from "@/components/projects/velocity-chart";
import { Play, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { EmptySprintIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { DropResult } from "@hello-pangea/dnd";
import { SprintCard } from "@/features/projects/sprints/sprint-card";
import { CompleteSprintSheet } from "@/features/projects/sprints/complete-sprint-sheet";
import { SprintPlanningPanel } from "@/features/projects/sprints/sprint-planning-panel";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SprintsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: sprints, isLoading } = useSprints(projectId);
  const { data: project } = useProject(projectId);

  const [planningSprintId, setPlanningSprintId] = useState<number | null>(null);
  const [completionSprintId, setCompletionSprintId] = useState<number | null>(null);
  const [moveToOption, setMoveToOption] = useState<string>("backlog");

  const updateSprint = useUpdateSprint(projectId);
  const updateTicket = useUpdateTicket(projectId);

  const handleStartSprint = useCallback((sprintId: number) => {
    updateSprint.mutate(
      { sprintId, status: "ACTIVE" },
      {
        onSuccess: () => toast.success("Sprint started"),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [updateSprint]);

  const handleOpenCompletionSheet = useCallback((sprintId: number) => {
    setCompletionSprintId(sprintId);
  }, []);

  const handleOpenPlanningSheet = useCallback((sprintId: number) => {
    setPlanningSprintId(sprintId);
  }, []);

  const handleClosePlanningSheet = useCallback(() => {
    setPlanningSprintId(null);
  }, []);

  const handleCancelCompletion = useCallback(() => {
    setCompletionSprintId(null);
  }, []);

  const handleConfirmCompletion = useCallback(() => {
    if (!completionSprintId) return;
    const sprint = sprints?.find((s) => s.id === completionSprintId);
    if (!sprint) return;

    const incompleteTickets = (sprint.tickets || []).filter((t) => t.status !== "DONE");
    const nextSprint = sprints?.find((s) => s.status === "PLANNED");
    const targetSprintId = moveToOption === "next" && nextSprint ? nextSprint.id : undefined;

    const promises = incompleteTickets.map((ticket) =>
      updateTicket.mutateAsync({ ticketId: ticket.id, sprintId: targetSprintId })
    );

    Promise.all(promises)
      .then(() => {
        updateSprint.mutate(
          { sprintId: completionSprintId, status: "COMPLETED" },
          {
            onSuccess: () => toast.success("Sprint completed"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }
        );
        setCompletionSprintId(null);
      })
      .catch(() => {
        toast.error("Failed to move some tickets");
      });
  }, [completionSprintId, sprints, moveToOption, updateTicket, updateSprint]);

  const handlePlanningDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const ticketId = parseInt(draggableId);
    const newSprintId = destination.droppableId === "backlog" ? undefined : parseInt(destination.droppableId);

    updateTicket.mutate(
      { ticketId, ...(newSprintId !== undefined ? { sprintId: newSprintId } : {}) },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }, [updateTicket]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const activeSprints = sprints?.filter((s) => s.status === "ACTIVE") || [];
  const plannedSprints = sprints?.filter((s) => s.status === "PLANNED") || [];
  const completedSprints = sprints?.filter((s) => s.status === "COMPLETED") || [];

  const allTickets = project?.tickets || [];
  const backlogTickets = allTickets.filter((t) => !t.sprintId && t.type !== "EPIC");

  const planningSprint = planningSprintId ? sprints?.find((s) => s.id === planningSprintId) : null;
  const completionSprint = completionSprintId ? sprints?.find((s) => s.id === completionSprintId) : null;
  const nextPlannedSprint = sprints?.find((s) => s.status === "PLANNED");

  const subtitleParts: string[] = [];
  if (activeSprints.length > 0) subtitleParts.push(`${activeSprints.length} active`);
  if (plannedSprints.length > 0) subtitleParts.push(`${plannedSprints.length} planned`);
  if (completedSprints.length > 0) subtitleParts.push(`${completedSprints.length} completed`);
  const subtitle = subtitleParts.length > 0
    ? subtitleParts.join(", ")
    : "Create your first sprint to start organizing work";

  return (
    <PageWrapper
      title="Sprints"
      subtitle={subtitle}
      actions={<CreateSprintDialog projectId={projectId} />}
    >

      {planningSprintId && planningSprint && (
        <SprintPlanningPanel
          sprint={planningSprint}
          backlogTickets={backlogTickets}
          onDragEnd={handlePlanningDragEnd}
          onDone={handleClosePlanningSheet}
        />
      )}

      {activeSprints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Active Sprints
          </h2>
          <div className="grid gap-4">
            {activeSprints.map((sprint) => (
              <div key={sprint.id} className="space-y-4">
                <SprintCard
                  sprint={sprint}
                  projectId={projectId}
                  onComplete={handleOpenCompletionSheet}
                  onPlan={handleOpenPlanningSheet}
                  isUpdating={updateSprint.isPending}
                />
                <BurndownChart sprintId={sprint.id} projectId={projectId} />
              </div>
            ))}
          </div>
        </section>
      )}

      {plannedSprints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            Planned Sprints
          </h2>
          <div className="grid gap-4">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onStart={handleStartSprint}
                onPlan={handleOpenPlanningSheet}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {completedSprints.length > 0 && <VelocityChart sprints={completedSprints} />}

      {completedSprints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Sprints
          </h2>
          <div className="grid gap-4">
            {completedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {sprints?.length === 0 && (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            illustration={<EmptySprintIllustration className="h-32 w-32 opacity-95" />}
            title="No sprints yet"
            description="Create your first sprint to start organizing your work."
          />
          <CreateSprintDialog projectId={projectId} />
        </div>
      )}

      <CompleteSprintSheet
        sprint={completionSprint ?? null}
        nextPlannedSprint={nextPlannedSprint}
        moveToOption={moveToOption}
        isUpdating={updateSprint.isPending}
        onMoveToChange={setMoveToOption}
        onCancel={handleCancelCompletion}
        onConfirm={handleConfirmCompletion}
      />
    </PageWrapper>
  );
}
