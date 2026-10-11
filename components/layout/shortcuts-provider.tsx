"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navHrefPath, type NavGroup } from "./sidebar/sidebar-nav-items";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { OPEN_COMMAND_PALETTE_EVENT } from "./command-palette";

/** `g` + letter targets. First candidate present in the role's nav wins; none present → shortcut does nothing. */
export const GO_SHORTCUTS: Record<string, { label: string; hrefs: string[] }> = {
  d: { label: "Dashboard", hrefs: ["/dashboard"] },
  l: { label: "Leads", hrefs: ["/crm/leads"] },
  p: { label: "Deals (pipeline)", hrefs: ["/crm/deals"] },
  e: { label: "Employees", hrefs: ["/hr/employees", "/hr"] },
  j: { label: "Projects", hrefs: ["/projects"] },
  c: { label: "Calendar", hrefs: ["/calendar"] },
  n: { label: "Notifications", hrefs: ["/notifications"] },
  s: { label: "Settings", hrefs: ["/settings"] },
};

const GO_TIMEOUT_MS = 1000;

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || !!target.closest("input, textarea, select, [contenteditable='true']");
}

const ShortcutsContext = createContext<{ openShortcuts: () => void }>({ openShortcuts: () => {} });

export function useShortcuts() {
  return useContext(ShortcutsContext);
}

interface ShortcutsProviderProps {
  navGroups: NavGroup[];
  onToggleSidebar: () => void;
  children: React.ReactNode;
}

export function ShortcutsProvider({ navGroups, onToggleSidebar, children }: ShortcutsProviderProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const goPendingUntil = useRef(0);

  const navPaths = useMemo(
    () => new Set(navGroups.flatMap((g) => g.routes.map((r) => navHrefPath(r.href)))),
    [navGroups],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      // Leave keys alone while a dialog/menu owns focus (Radix handles Esc etc.).
      if (document.querySelector("[role='dialog'][data-state='open'], [role='menu'][data-state='open']")) return;

      const key = e.key.toLowerCase();

      if (Date.now() < goPendingUntil.current) {
        goPendingUntil.current = 0;
        const href = GO_SHORTCUTS[key]?.hrefs.find((h) => navPaths.has(h));
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      switch (e.key) {
        case "g":
          goPendingUntil.current = Date.now() + GO_TIMEOUT_MS;
          return;
        case "/": {
          const el = document.querySelector<HTMLElement>("[data-page-search]");
          const input = el?.matches("input, textarea") ? el : el?.querySelector<HTMLElement>("input, textarea");
          if (input) {
            e.preventDefault();
            input.focus();
          }
          return;
        }
        case "[":
          e.preventDefault();
          onToggleSidebar();
          return;
        case "?":
          e.preventDefault();
          setDialogOpen(true);
          return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navPaths, onToggleSidebar, router]);

  const ctx = useMemo(() => ({ openShortcuts: () => setDialogOpen(true) }), []);

  return (
    <ShortcutsContext.Provider value={ctx}>
      {children}
      <ShortcutsDialog open={dialogOpen} onOpenChange={setDialogOpen} goShortcuts={GO_SHORTCUTS} />
    </ShortcutsContext.Provider>
  );
}
