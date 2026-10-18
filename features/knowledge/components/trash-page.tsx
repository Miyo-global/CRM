"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useKbTrash } from "@/lib/api/hooks/knowledge";
import { timeAgo } from "@/lib/date-utils";

import { TrashBulkActions } from "./trash-bulk-actions";
import { TrashMemberFilter } from "./trash-member-filter";
import { TrashRetentionSection } from "./trash-retention-section";

/**
 * KB-0086: the trash.
 *
 * Someone without the purge permission sees restore and nothing else: the
 * irreversible action is not offered where it cannot be taken.
 */
export function TrashPage({
  canPurge = false,
  canSetRetention = false,
}: {
  canPurge?: boolean;
  canSetRetention?: boolean;
}) {
  const [deletedBy, setDeletedBy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading } = useKbTrash({ deletedBy: deletedBy ?? undefined });

  const needle = q.trim().toLowerCase();
  const items = (data?.items ?? []).filter((item) =>
    needle ? item.title.toLowerCase().includes(needle) : true,
  );
  const filtered = !!needle || !!deletedBy;

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <PageWrapper
      title="Trash"
      subtitle="Deleted pages, until they are removed for good"
      breadcrumbs={false}
      filters={
        <div className="flex flex-col gap-2">
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Filter by title"
            className="h-8 w-full sm:w-56"
          />
          <TrashMemberFilter value={deletedBy} onChange={setDeletedBy} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {canSetRetention ? <TrashRetentionSection /> : null}

        <TrashBulkActions
          selected={selected}
          canPurge={canPurge}
          onDone={() => setSelected([])}
        />

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : items.length === 0 && !filtered ? (
          <EmptyState
            title="Nothing in the trash"
            description="A page you delete waits here before it is removed for good."
          />
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="min-w-[200px]">Page</TableHead>
                  <TableHead className="w-40">Deleted by</TableHead>
                  <TableHead className="w-32 text-right">Deleted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableEmpty colSpan={4} message="No deleted pages match these filters." />
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onCheckedChange={() => toggle(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          <span className="truncate">{item.title || "Untitled"}</span>
                          {item.legalHold ? (
                            <StatusPill tone="warning">Legal hold</StatusPill>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="truncate text-muted-foreground">
                        {item.deletedByName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.deletedAt ? timeAgo(item.deletedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
