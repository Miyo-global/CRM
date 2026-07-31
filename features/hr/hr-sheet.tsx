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
import { Loader2 } from "lucide-react";

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
}: HrSheetProps) {
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
      <SheetContent side={side} className="flex h-svh max-h-svh flex-col p-0 gap-0 sm:max-w-lg w-full">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
        </SheetHeader>

        {pinned ? (
          <div className="shrink-0 space-y-4 border-b bg-background px-4 py-4">{pinned}</div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-4 space-y-4">
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <div className="shrink-0 border-t px-4 py-2">{footer}</div>
        )}

        {showSubmit && (
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isPending || !onSubmit || submitDisabled}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
