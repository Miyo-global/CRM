"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

/**
 * KB-0068: the top of the wiki sidebar — quick find and "New page".
 *
 * The shortcut is shown rather than only bound: a shortcut nobody can see is a
 * shortcut nobody uses.
 */
export function WikiSidebarChrome({
  onQuickFind,
  onNewPage,
  isMac,
}: {
  onQuickFind: () => void;
  onNewPage?: () => void;
  isMac: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onQuickFind}
        className="flex w-full items-center gap-2 rounded-md border border-border-strong bg-surface-sunken px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Quick find</span>
        <span className="ml-auto flex items-center gap-0.5">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      {onNewPage ? (
        <Button size="sm" variant="secondary" className="justify-start" onClick={onNewPage}>
          <Plus className="h-4 w-4" />
          New page
        </Button>
      ) : null}
    </div>
  );
}
