"use client";

import { EmptyState } from "@/components/ui/empty-state";

interface ProjectsEmptyStateProps {
  /** Opens the create dialog; omit to render without a primary action. */
  onCreate?: () => void;
}

export function ProjectsEmptyState({ onCreate }: ProjectsEmptyStateProps = {}) {
  return (
    <EmptyState
      title="No projects found"
      description="Create your first project to start organizing work."
      action={onCreate ? { label: "New Project", onClick: onCreate } : undefined}
    />
  );
}
