"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  className,
}: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "flex flex-col p-0 gap-0 sm:max-w-lg",
          className
        )}
      >
        {/* Sticky header */}
        <SheetHeader className="shrink-0 px-6 py-4 border-b border-border/60">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground mt-0.5">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

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
      </SheetContent>
    </Sheet>
  );
}
