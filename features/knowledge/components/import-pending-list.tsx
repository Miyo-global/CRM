"use client";

import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KbImportItem } from "@/lib/api/hooks/knowledge";

/** KB-0088: the files waiting to be imported, with a way to drop one. */
export function ImportPendingList({
  items,
  skipped,
  onRemove,
}: {
  items: KbImportItem[];
  skipped: Array<{ name: string; reason: string }>;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0 && skipped.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <ul className="max-h-60 overflow-y-auto rounded-lg border border-border">
        {items.map((item, index) => (
          <li
            key={`${item.title}-${index}`}
            className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${item.title}`}
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {skipped.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Left out: {skipped.map((entry) => `${entry.name} (${entry.reason})`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
