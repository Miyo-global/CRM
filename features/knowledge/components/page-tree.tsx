"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useCreateKbPage,
  useDeleteKbPage,
  useKbPageTree,
  useMoveKbPage,
  type KbPageTreeNode,
} from "@/lib/api/hooks/knowledge";
import { KB_TRASH, pageHref } from "@/lib/knowledge/routes";

import { isWithinSubtree, readExpanded, writeExpanded } from "../lib/page-tree-state";
import { PageTreeItem } from "./page-tree-item";

/**
 * KB-0069: the page tree.
 *
 * The server sends the visible pages flat and capped, with each node's parent,
 * and the hierarchy is assembled here: one request instead of one per branch,
 * and the parent links needed to refuse an illegal drag come with it.
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

  const { data, isLoading } = useKbPageTree({ spaceId, projectId });
  const createPage = useCreateKbPage();
  const movePage = useMoveKbPage(dragging ?? 0);
  const deletePage = useDeleteKbPage();

  const { childrenOf, roots, parentOf } = useMemo(() => {
    const nodes = data?.nodes ?? [];
    const byParent = new Map<number | null, KbPageTreeNode[]>();
    const parents = new Map<number, number | null>();
    const ids = new Set(nodes.map((node) => node.id));

    for (const node of nodes) {
      // A page whose parent is outside what this viewer can see reads as a
      // root here, rather than disappearing with its parent.
      const parent = node.parentPageId != null && ids.has(node.parentPageId)
        ? node.parentPageId
        : null;
      parents.set(node.id, parent);
      const siblings = byParent.get(parent) ?? [];
      siblings.push(node);
      byParent.set(parent, siblings);
    }

    return { childrenOf: byParent, roots: byParent.get(null) ?? [], parentOf: parents };
  }, [data]);

  const activeId = useMemo(() => {
    const match = pathname.match(/\/doc\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [pathname]);

  function addChild(parentPageId: number) {
    createPage.mutate(
      { parentPageId, spaceId, projectId },
      {
        onSuccess: (page) => router.push(pageHref(page.id)),
        onError: () => toast.error("Couldn't create the page."),
      },
    );
  }

  // Trash is recoverable, so the row's Delete needs no confirm (R3-PRJ-05).
  function remove(pageId: number) {
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success("Page moved to Trash");
        if (activeId === pageId) router.push(KB_TRASH);
      },
      onError: () => toast.error("Couldn't delete the page."),
    });
  }

  function drop(targetId: number) {
    if (dragging == null) return;
    movePage.mutate(
      { parentPageId: targetId },
      {
        onSuccess: () => setDragging(null),
        onError: () => {
          setDragging(null);
          toast.error("Couldn't move the page there.");
        },
      },
    );
  }

  function renderRows(nodes: KbPageTreeNode[], depth: number): React.ReactNode[] {
    return nodes.flatMap((node) => {
      const isOpen = expanded.includes(node.id);
      const children = childrenOf.get(node.id) ?? [];
      // Dropping a page onto itself or into its own subtree would orphan the
      // branch, so the row refuses it rather than letting the server 400.
      const dropDisabled = dragging != null && isWithinSubtree(dragging, node.id, parentOf);

      return [
        <PageTreeItem
          key={node.id}
          page={{ ...node, hasChildren: node.hasChildren ?? children.length > 0 }}
          href={pageHref(node.id)}
          depth={depth}
          expanded={isOpen}
          active={activeId === node.id}
          canEdit={canEdit}
          dropDisabled={dropDisabled}
          onToggle={() => toggle(node.id)}
          onAddChild={() => addChild(node.id)}
          onDelete={() => remove(node.id)}
          onDragStart={() => setDragging(node.id)}
          onDropOn={() => drop(node.id)}
          onKeyDown={(event) => {
            // Arrows open and close a branch; Enter follows the link itself.
            if (event.key === "ArrowRight" && !isOpen && children.length > 0) toggle(node.id);
            if (event.key === "ArrowLeft" && isOpen) toggle(node.id);
          }}
        />,
        ...(isOpen ? renderRows(children, depth + 1) : []),
      ];
    });
  }

  return (
    <div className="flex flex-col gap-0.5" role="tree" aria-label="Pages">
      {renderRows(roots, 0)}

      {!isLoading && roots.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">No pages yet.</p>
      ) : null}

      {data?.truncated ? (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Showing the first 500 pages. Use search to find the rest.
        </p>
      ) : null}
    </div>
  );
}
