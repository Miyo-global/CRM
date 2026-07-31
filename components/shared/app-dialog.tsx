"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0 max-w-md max-h-[90vh]",
          className
        )}
      >
        {/* Sticky header */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border/60">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-6 py-4">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/30">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
