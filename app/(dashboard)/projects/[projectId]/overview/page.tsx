"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectOverview } from "@/features/projects/overview/project-overview";

export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return (
    <PageWrapper title="Overview">
      <ProjectOverview projectId={Number(projectId)} />
    </PageWrapper>
  );
}
