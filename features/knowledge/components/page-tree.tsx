"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useCreateKbPage, useKbPageTree, useMoveKbPage } from "@/lib/api/hooks/knowledge";
import { pageHref } from "@/lib/knowledge/routes";

import { isWithinSubtree, readExpanded, writeExpanded } from "../lib/page-tree-state";
import { PageTreeItem, type PageTreeRow } from "./page-tree-item";

/**
 * KB-0069: the page tree for one space.
 *
 * Children are fetched per open branch rather than as one whole-tree payload,
 * so a wiki with thousands of pages still opens quickly. The parent links of
 * everything loaded are kept so a drag onto a page's own descendant can be
 * refused here; the server refuses it too (400), this only saves the round trip.
 */
export function PageTree({
  spaceId,
  projectId,
  canEdit = false,
}: {
  spaceId?: number;
  projectId?: number;
  canEdit?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<number[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const parentOf = useRef(new Map<number, number | null>());

  useEffect(() => {
    setExpanded(readExpanded());
  }, []);

  const toggle = useCallback((pageId: number) => {
    setExpanded((current) => {
      const next = current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId];
      writeExpanded(next);
      return next;
    });
  }, []);

  const roots = useKbPageTree({ spaceId, projectId });
  const createPage = useCreateKbPage();

  const rows = roots.data?.items ?? [];
  for (const row of rows) parentOf.current.set(row.id, row.parentId ?? null);

  const activeId = useMemo(() => {
    const match = pathname.match(/\/doc\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [pathname]);

  return (
    <div className="flex flex-col gap-0.5" role="tree" aria-label="Pages">
      {rows.map((row) => (
        <PageTreeBranch
          key={row.id}
          page={row}
          depth={0}
          activeId={activeId}
          canEdit={canEdit}
          expanded={expanded}
          dragging={dragging}
          parentOf={parentOf.current}
          onToggle={toggle}
          onDragStart={setDragging}
          onDragEnd={() => setDragging(null)}
          onAddChild={(parentId) => {
            createPage.mutate(
              { parentId, spaceId, projectId },
              {
                onSuccess: (page) => router.push(pageHref(page.id)),
                onError: () => toast.error("Couldn't create the page."),
              },
            );
          }}
        />
      ))}

      {!roots.isLoading && rows.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">No pages yet.</p>
      ) : null}
    </div>
  );
}

function PageTreeBranch({
  page,
  depth,
  activeId,
  canEdit,
  expanded,
  dragging,
  parentOf,
  onToggle,
  onDragStart,
  onDragEnd,
  onAddChild,
}: {
  page: PageTreeRow;
  depth: number;
  activeId: number | null;
  canEdit: boolean;
  expanded: number[];
  dragging: number | null;
  parentOf: Map<number, number | null>;
  onToggle: (pageId: number) => void;
  onDragStart: (pageId: number) => void;
  onDragEnd: () => void;
  onAddChild: (parentId: number) => void;
}) {
  const isOpen = expanded.includes(page.id);
  // A closed branch fetches nothing; opening it is what loads its children.
  const children = useKbPageTree({ parentId: page.id }, { enabled: isOpen });
  const movePage = useMoveKbPage(dragging ?? 0);

  const childRows = isOpen ? (children.data?.items ?? []) : [];
  for (const row of childRows) parentOf.set(row.id, row.parentId ?? page.id);

  // Dropping a page onto itself or into its own subtree would orphan the
  // branch, so the row refuses the drop instead of letting the server 400.
  const dropDisabled = dragging != null && isWithinSubtree(dragging, page.id, parentOf);

  return (
    <>
      <PageTreeItem
        page={page}
        href={pageHref(page.id)}
        depth={depth}
        expanded={isOpen}
        active={activeId === page.id}
        canEdit={canEdit}
        dropDisabled={dropDisabled}
        onToggle={() => onToggle(page.id)}
        onAddChild={() => onAddChild(page.id)}
        onDragStart={() => onDragStart(page.id)}
        onDropOn={() => {
          if (dragging == null || dropDisabled) return;
          movePage.mutate(
            { parentId: page.id },
            {
              onSuccess: () => onDragEnd(),
              onError: () => {
                onDragEnd();
                toast.error("Couldn't move the page there.");
              },
            },
          );
        }}
        onKeyDown={(event) => {
          // Arrows open and close a branch; Enter follows the link itself.
          if (event.key === "ArrowRight" && !isOpen && page.hasChildren) onToggle(page.id);
          if (event.key === "ArrowLeft" && isOpen) onToggle(page.id);
        }}
      />

      {childRows.map((child) => (
        <PageTreeBranch
          key={child.id}
          page={child}
          depth={depth + 1}
          activeId={activeId}
          canEdit={canEdit}
          expanded={expanded}
          dragging={dragging}
          parentOf={parentOf}
          onToggle={onToggle}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onAddChild={onAddChild}
        />
      ))}
    </>
  );
}
