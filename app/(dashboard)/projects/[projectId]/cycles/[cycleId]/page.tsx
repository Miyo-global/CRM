"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { useCycleDetail } from "@/lib/api/hooks/projects/cycle-detail";
import { CycleDetailView } from "@/features/projects/cycles/cycle-detail-view";

export default function CycleDetailPage({ params }: { params: Promise<{ projectId: string; cycleId: string }> }) {
  const { projectId: rawProjectId, cycleId: rawCycleId } = use(params);
  const projectId = /^\d+$/.test(rawProjectId) ? Number(rawProjectId) : 0;
  const cycleId = /^\d+$/.test(rawCycleId) ? Number(rawCycleId) : 0;
  const { data: project } = useProject(projectId);
  const { data } = useCycleDetail(projectId, cycleId);

  return (
    <PageWrapper title={data?.cycle.name ?? "Cycle"}>
      <CycleDetailView projectId={projectId} cycleId={cycleId} canEdit={project?.viewerRole !== "VIEWER"} />
    </PageWrapper>
  );
}
