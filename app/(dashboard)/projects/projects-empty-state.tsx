"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";

export function ProjectsEmptyState() {
  return (
    <EmptyState
      illustration={<EmptyProjectsIllustration />}
      title="No projects found"
      description="Create your first project to start organizing work."
    />
  );
}

