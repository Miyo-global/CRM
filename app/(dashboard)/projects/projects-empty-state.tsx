"use client";

import { EmptyState } from "@/components/ui/empty-state";

interface ProjectsEmptyStateProps {
  /** Opens the create dialog; omit to render without a primary action. */
  onCreate?: () => void;
}

export function ProjectsEmptyState({ onCreate }: ProjectsEmptyStateProps = {}) {
  return (
    <EmptyState
      title={onCreate ? "No projects yet" : "You're not on any projects yet"}
      description={
        onCreate
          ? "Create your first project to start organizing work."
          : "When a project manager adds you to a project, it shows up here."
      }
      action={onCreate ? { label: "New project", onClick: onCreate } : undefined}
    />
  );
}
