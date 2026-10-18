"use client";

import Link from "next/link";

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
import type { KbSpace } from "@/lib/api/hooks/knowledge";
import { toneDot } from "@/lib/design/tones";
import { spaceHref } from "@/lib/knowledge/routes";
import { cn } from "@/lib/utils";

import { spaceColorTone, spaceTypeLabel } from "../lib/space-meta";

/** KB-0084: the spaces table. */
export function SpacesListTable({
  spaces,
  emptyMessage = "No spaces match these filters.",
}: {
  spaces: KbSpace[];
  emptyMessage?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Space</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="w-28">Audience</TableHead>
            <TableHead className="w-24 text-right">Pages</TableHead>
            <TableHead className="w-28">State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {spaces.length === 0 ? (
            <TableEmpty colSpan={5} message={emptyMessage} />
          ) : (
            spaces.map((space) => (
              <TableRow key={space.id}>
                <TableCell>
                  <Link
                    href={spaceHref(space.id)}
                    className="flex items-center gap-2 font-medium text-foreground"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        toneDot[spaceColorTone(space.color)],
                      )}
                    />
                    <span className="truncate">{space.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {spaceTypeLabel(space.type)}
                </TableCell>
                <TableCell className="text-muted-foreground">{space.audience ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {space.pageCount ?? "—"}
                </TableCell>
                <TableCell>
                  {space.archivedAt ? (
                    <StatusPill tone="warning">Archived</StatusPill>
                  ) : (
                    <StatusPill tone="success">Active</StatusPill>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
