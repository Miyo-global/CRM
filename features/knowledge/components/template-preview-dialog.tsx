"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useKbTemplate } from "@/lib/api/hooks/knowledge";
import { plateToPlainText } from "@/components/editor/plate/plate-value-convert";

/**
 * KB-0085: what a template puts on the page.
 *
 * Plain text rather than a rendered editor: this is a glance before choosing,
 * and the editor is what the page itself is for.
 */
export function TemplatePreviewDialog({
  templateId,
  name,
  open,
  onOpenChange,
  onUse,
}: {
  templateId?: number;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}) {
  const template = useKbTemplate(open ? templateId : undefined);
  const content = template.data?.content;
  const text = Array.isArray(content) ? plateToPlainText(content) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{template.data?.description ?? "Template preview"}</DialogDescription>
        </DialogHeader>

        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-sm text-foreground">
          {template.isLoading ? "Loading…" : text || "This template starts you with an empty page."}
        </pre>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onUse}>Use template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
