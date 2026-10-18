"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KbPageSummary } from "@/lib/api/hooks/knowledge";
import { timeAgo } from "@/lib/date-utils";
import { pageHref } from "@/lib/knowledge/routes";

import { contentTypeLabel, statusBadge } from "../lib/kb-labels";
import { StatusPill } from "@/components/ui/status-pill";

/**
 * KB-0070: the all-pages table.
 *
 * It scrolls inside its own container so the page header and filters stay put
 * on a phone instead of the whole page scrolling sideways.
 */
export function WikiPageCollectionTable({
  pages,
  ownerNames,
  emptyMessage = "No pages match these filters.",
}: {
  pages: KbPageSummary[];
  ownerNames?: Map<string, string>;
  emptyMessage?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Page</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-36">Type</TableHead>
            <TableHead className="w-40">Owner</TableHead>
            <TableHead className="w-28 text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.length === 0 ? (
            <TableEmpty colSpan={5} message={emptyMessage} />
          ) : (
            pages.map((page) => {
              const badge = statusBadge(page.status);
              return (
                <TableRow key={page.id}>
                  <TableCell>
                    <Link
                      href={pageHref(page.id)}
                      className="flex items-center gap-2 font-medium text-foreground"
                    >
                      {page.icon ? (
                        <span aria-hidden>{page.icon}</span>
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{page.title || "Untitled"}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contentTypeLabel(page.contentType)}
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {(page.ownerId && ownerNames?.get(page.ownerId)) || "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {page.updatedAt ? timeAgo(page.updatedAt) : "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
