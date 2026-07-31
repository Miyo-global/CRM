"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

interface KeyboardShortcutsProps {
  projectId: number;
  onCreateTicket?: () => void;
}

export function KeyboardShortcuts({
  projectId,
  onCreateTicket,
}: KeyboardShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);
  const base = `/projects/${projectId}`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {

      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case "c":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onCreateTicket?.();
          }
          break;
        case "b":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push(base);
          }
          break;
        case "Escape":

          if (pathname) {
            const url = new URL(window.location.href);
            if (url.searchParams.has("ticket")) {
              url.searchParams.delete("ticket");
              router.replace(url.pathname + url.search, { scroll: false });
            }
          }
          break;
        case "?":
          if (e.shiftKey) {
            e.preventDefault();
            setShowHelp((v) => !v);
          }
          break;
      }
    },
    [router, base, pathname, onCreateTicket]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <KeyboardShortcutsDialog
      open={showHelp}
      onOpenChange={setShowHelp}
    />
  );
}
