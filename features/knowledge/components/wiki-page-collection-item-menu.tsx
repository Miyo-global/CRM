"use client";

import { Copy, CornerUpRight, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pageHref } from "@/lib/knowledge/routes";

/** KB-0069: the "…" menu on a tree row and on a page card. */
export function WikiPageCollectionItemMenu({
  pageId,
  canEdit,
  canDelete,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
}: {
  pageId: number;
  canEdit: boolean;
  canDelete: boolean;
  onRename?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}) {
  async function copyLink() {
    const url = `${window.location.origin}${pageHref(pageId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Clipboard access can be refused; show the link so it can be copied by
      // hand rather than failing silently.
      toast.error("Couldn't copy. The link is " + url);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Page actions"
          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-surface-sunken hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {canEdit && onRename ? (
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
        ) : null}
        {canEdit && onDuplicate ? (
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
        ) : null}
        {canEdit && onMove ? (
          <DropdownMenuItem onSelect={onMove}>
            <CornerUpRight className="h-4 w-4" />
            Move
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <Link2 className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        {canDelete && onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} variant="destructive">
              <Trash2 className="h-4 w-4" />
              Move to trash
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
