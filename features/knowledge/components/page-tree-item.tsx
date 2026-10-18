"use client";

import { ChevronRight, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { WikiPageCollectionItemMenu } from "./wiki-page-collection-item-menu";

export interface PageTreeRow {
  id: number;
  title: string;
  icon?: string | null;
  parentId?: number | null;
  hasChildren?: boolean;
}

/**
 * KB-0069: one row of the tree.
 *
 * A row is a link first: opening a page must not depend on JavaScript having
 * hydrated the expander.
 */
export function PageTreeItem({
  page,
  href,
  depth,
  expanded,
  active,
  canEdit,
  dropDisabled,
  onToggle,
  onAddChild,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
  onDragStart,
  onDropOn,
  onKeyDown,
}: {
  page: PageTreeRow;
  href: string;
  depth: number;
  expanded: boolean;
  active: boolean;
  canEdit: boolean;
  /** True while dragging something that cannot legally land here. */
  dropDisabled: boolean;
  onToggle: () => void;
  onAddChild?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDropOn?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 transition-colors",
        active ? "bg-surface-sunken" : "hover:bg-surface-sunken",
        dropDisabled && "opacity-40",
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (dropDisabled || !onDropOn) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (dropDisabled || !onDropOn) return;
        event.preventDefault();
        onDropOn();
      }}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? `Collapse ${page.title}` : `Expand ${page.title}`}
        aria-expanded={expanded}
        className={cn(
          "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
          !page.hasChildren && "invisible",
        )}
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
      </button>

      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-sm text-foreground"
      >
        {page.icon ? (
          <span aria-hidden className="shrink-0 text-sm leading-none">
            {page.icon}
          </span>
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{page.title || "Untitled"}</span>
      </Link>

      {canEdit && onAddChild ? (
        <button
          type="button"
          onClick={onAddChild}
          aria-label={`Add a page under ${page.title}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-surface-sunken hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <WikiPageCollectionItemMenu
        pageId={page.id}
        canEdit={canEdit}
        canDelete={canEdit}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onMove={onMove}
        onDelete={onDelete}
      />
    </div>
  );
}
