"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface HrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Required fields pinned below the header; optional fields scroll in the body. */
  pinned?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  isPending?: boolean;
  side?: "right" | "left";
  showSubmit?: boolean;
  submitDisabled?: boolean;
  /** Shown next to a disabled submit so it never fails silently (R3-UX-01). */
  submitDisabledReason?: string | null;
}

export function HrSheet({
  open,
  onOpenChange,
  title,
  description,
  pinned,
  children,
  footer,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isPending = false,
  side = "right",
  showSubmit = true,
  submitDisabled = false,
  submitDisabledReason,
}: HrSheetProps) {
  const disabledHint = submitDisabled && !isPending ? submitDisabledReason : null;
  const handleSubmit = () => {
    if (onSubmit) onSubmit();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} size="md" className="flex h-svh max-h-svh w-full flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-5">
          <SheetTitle className="font-display text-lg font-bold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        {pinned ? (
          <div className="shrink-0 space-y-4 border-b border-border bg-surface-raised px-6 py-4">{pinned}</div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-6 py-5">
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <div className="shrink-0 border-t border-border px-6 py-2">{footer}</div>
        )}

        {showSubmit && (
          <SheetFooter className="shrink-0 bg-surface-raised">
            {disabledHint && (
              <p id="hr-sheet-submit-hint" className="text-xs text-muted-foreground sm:mr-auto sm:self-center">
                {disabledHint}
              </p>
            )}
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isPending}
              disabled={!onSubmit || submitDisabled}
              aria-describedby={disabledHint ? "hr-sheet-submit-hint" : undefined}
            >
              {submitLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
