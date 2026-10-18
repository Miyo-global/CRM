"use client";

import { Archive, Pencil, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { useKbPages, useKbSpace } from "@/lib/api/hooks/knowledge";

import { spaceTypeLabel } from "../lib/space-meta";
import { KbPageNotFound } from "./kb-page-not-found";
import { NewPageButton } from "./new-page-button";
import { SpaceArchiveImpactDialog } from "./space-archive-impact";
import { SpaceManagerHealthSummary } from "./space-manager-health-summary";
import { SpaceMembersSheet } from "./space-members-sheet";
import { SpaceSheet } from "./space-sheet";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

/** KB-0084: one space — its pages, its members, and the archive flow. */
export function SpaceDetailPage({
  spaceId,
  canManage = false,
}: {
  spaceId: number;
  canManage?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const space = useKbSpace(spaceId);
  const pages = useKbPages({ scope: "space", spaceId, limit: 50 });

  if (space.isError) return <KbPageNotFound />;
  if (!space.data) return <Skeleton className="m-6 h-48" />;

  return (
    <PageWrapper
      title={space.data.name}
      subtitle={space.data.description ?? spaceTypeLabel(space.data.type)}
      badge={space.data.archivedAt ? <StatusPill tone="warning">Archived</StatusPill> : undefined}
      breadcrumbs={false}
      actions={
        <div className="flex items-center gap-2">
          <NewPageButton spaceId={spaceId} />
          {canManage ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setMembersOpen(true)}>
                <Users className="h-4 w-4" />
                Members
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {!space.data.archivedAt ? (
                <Button size="sm" variant="secondary" onClick={() => setArchiveOpen(true)}>
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {canManage ? <SpaceManagerHealthSummary spaceId={spaceId} /> : null}

        <WikiPageCollectionTable
          pages={pages.data?.items ?? []}
          emptyMessage={pages.isLoading ? "Loading…" : "No pages in this space yet."}
        />
      </div>

      <SpaceSheet space={space.data} open={editOpen} onOpenChange={setEditOpen} />
      <SpaceMembersSheet spaceId={spaceId} open={membersOpen} onOpenChange={setMembersOpen} />
      <SpaceArchiveImpactDialog
        spaceId={spaceId}
        spaceName={space.data.name}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </PageWrapper>
  );
}
