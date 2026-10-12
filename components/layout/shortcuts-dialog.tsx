"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goShortcuts: Record<string, { label: string }>;
}

type Row = { keys: string[]; label: string; sequence?: boolean };

const GENERAL: Row[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Focus page search" },
  { keys: ["["], label: "Toggle sidebar" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
  { keys: ["Esc"], label: "Close dialogs and menus" },
];

function ShortcutList({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h3 className="mb-1 text-2xs font-semibold uppercase tracking-wider text-subtle-foreground">{title}</h3>
      <dl className="divide-y divide-border">
        {rows.map(({ keys, label, sequence }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
            <dt className="text-foreground">{label}</dt>
            <dd className="flex items-center gap-1 text-2xs text-muted-foreground">
              {keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                  {i > 0 && sequence && <span>then</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ShortcutsDialog({ open, onOpenChange, goShortcuts }: ShortcutsDialogProps) {
  const goRows: Row[] = Object.entries(goShortcuts).map(([key, { label }]) => ({
    keys: ["G", key.toUpperCase()],
    label: `Go to ${label.toLowerCase()}`,
    sequence: true,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are ignored while typing in a field.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <ShortcutList title="General" rows={GENERAL} />
          <ShortcutList title="Navigation" rows={goRows} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
