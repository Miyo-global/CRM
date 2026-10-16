"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-overlay bg-overlay backdrop-blur-xs data-[state=open]:animate-fade-in",
        className
      )}
      {...props}
    />
  )
}

const sheetSizes = {
  sm: "sm:max-w-100",
  md: "sm:max-w-140",
  lg: "sm:max-w-180",
  xl: "sm:max-w-240",
} as const

function SheetContent({
  className,
  children,
  side = "right",
  size,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  /** Panel width for left/right sheets: sm 400 / md 560 / lg 720 / xl 960. Omit to keep the legacy 384px default. */
  size?: keyof typeof sheetSizes
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-modal flex flex-col gap-4 bg-surface-raised p-6 text-foreground shadow-lg outline-none",
          // Right (default): full-width bottom sheet on phones, side panel from sm up.
          side === "right" &&
            "inset-x-0 bottom-0 max-h-[90svh] w-full max-sm:overflow-y-auto rounded-t-xl border-t border-border data-[state=open]:animate-fade-up sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-h-none sm:w-3/4 sm:max-w-sm sm:rounded-none sm:border-t-0 sm:border-l sm:data-[state=open]:animate-slide-in-right",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r border-border data-[state=open]:animate-fade-in sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b border-border data-[state=open]:animate-fade-in",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto rounded-t-xl border-t border-border data-[state=open]:animate-fade-up",
          size && (side === "left" || side === "right") && sheetSizes[size],
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-3 right-3 z-dropdown inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,box-shadow] duration-150 hover:bg-accent hover:text-foreground focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 p-4 pr-12", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex shrink-0 flex-row justify-end gap-2 border-t border-border px-6 py-3", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-lg leading-tight font-bold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
