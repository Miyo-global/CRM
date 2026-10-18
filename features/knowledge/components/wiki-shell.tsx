"use client";

import { PanelLeft } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import { QuickFindDialog } from "./quick-find-dialog";
import { WikiSidebarChrome } from "./wiki-sidebar-chrome";
import { WikiSidebarNav, WikiSidebarTrashLink } from "./wiki-sidebar-nav";

function noopSubscribe() {
  return () => {};
}

/**
 * KB-0068: the wiki frame — a left panel beside the page, a sheet on a phone.
 *
 * ⌘K is bound here rather than inside the dialog so it works from anywhere in
 * the wiki, including while the editor has focus.
 */
export function WikiShell({
  children,
  tree,
  onNewPage,
}: {
  children: React.ReactNode;
  /** The page tree for the current space (KB-0069). */
  tree?: React.ReactNode;
  onNewPage?: () => void;
}) {
  const isMobile = useIsMobile();
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The platform never changes, so there is nothing to subscribe to; this
  // reads it on the client and says "Ctrl" during the server render.
  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        // The browser's own find-in-page is Ctrl/⌘+F, so taking K is safe.
        event.preventDefault();
        setQuickFindOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <WikiSidebarChrome
        isMac={isMac}
        onQuickFind={() => {
          closeSheet();
          setQuickFindOpen(true);
        }}
        onNewPage={
          onNewPage
            ? () => {
                closeSheet();
                onNewPage();
              }
            : undefined
        }
      />
      <WikiSidebarNav onNavigate={closeSheet} />
      {/* The tree scrolls; the items above and Trash below stay put. */}
      <div className="min-h-0 flex-1 overflow-y-auto">{tree}</div>
      <div className="border-t border-border pt-2">
        <WikiSidebarTrashLink onNavigate={closeSheet} />
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      {isMobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <SheetTitle className="sr-only">Knowledge base navigation</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="hidden w-64 shrink-0 border-r border-border md:block">{sidebar}</aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isMobile ? (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSheetOpen(true)}
              aria-label="Open knowledge base navigation"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>

      <QuickFindDialog open={quickFindOpen} onOpenChange={setQuickFindOpen} />
    </div>
  );
}
