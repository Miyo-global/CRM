"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  { key: "c", description: "Create new ticket" },
  { key: "b", description: "Go to board" },
  { key: "Esc", description: "Close ticket sheet" },
  { key: "?", description: "Show this help" },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-muted-foreground">
                {s.description}
              </span>
              <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 text-xs font-mono text-muted-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
