"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbSpaces } from "@/lib/api/hooks/knowledge";

import { KB_SPACE_TYPE_LABELS } from "../lib/space-meta";
import { SpaceSheet } from "./space-sheet";
import { SpacesListTable } from "./spaces-list-table";

/** KB-0084: the spaces list. */
export function SpacesPage({ canManage = false }: { canManage?: boolean }) {
  const [type, setType] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading } = useKbSpaces({
    type: type ?? undefined,
    includeArchived: includeArchived || undefined,
  });
  const spaces = data?.items ?? [];
  const filtered = !!type || includeArchived;

  return (
    <PageWrapper
      title="Spaces"
      subtitle="Where pages live"
      breadcrumbs={false}
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            New space
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(KB_SPACE_TYPE_LABELS).map(([value, label]) => (
            <FilterChip
              key={value}
              active={type === value}
              onClick={() => setType(type === value ? null : value)}
            >
              {label}
            </FilterChip>
          ))}
          <FilterChip
            active={includeArchived}
            onClick={() => setIncludeArchived((current) => !current)}
          >
            Include archived
          </FilterChip>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : spaces.length === 0 && !filtered ? (
        <EmptyState
          title="No spaces yet"
          description="A space groups pages and sets who can see them by default."
          action={canManage ? { label: "New space", onClick: () => setSheetOpen(true) } : undefined}
        />
      ) : (
        <SpacesListTable spaces={spaces} />
      )}

      <SpaceSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
