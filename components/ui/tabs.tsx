"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";

/**
 * Tabs come in two looks, chosen on `TabsList`:
 * - `segmented` (default): pill/segmented control. Kept as the default because
 *   most existing callers style `TabsList` as a pill (grid-cols-N, bg-muted, p-1).
 * - `underline`: page-level tabs (border-b + 2px gold bar under the active tab).
 *   Opt in with `<TabsList variant="underline">`.
 * Triggers read the variant from the list via the `group/tabs-list` data attribute.
 */
type TabsVariant = "segmented" | "underline";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "segmented",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list text-muted-foreground inline-flex max-w-full items-center justify-start overflow-x-auto",
        variant === "underline"
          ? // Page tabs overflow on phones: scroll with a faded edge so the cut reads as "more" (QA-RESP-06).
            "h-10 w-full gap-6 border-b border-border overscroll-x-contain max-md:mask-x-from-95%"
          : "h-8 w-full sm:w-fit gap-0.5 rounded-md bg-muted p-0.5",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-w-fit items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium outline-none",
        "transition-[color,background-color,box-shadow] duration-150 focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // segmented (default)
        "h-full flex-1 sm:flex-initial rounded-sm px-3 text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        // underline
        "group-data-[variant=underline]/tabs-list:flex-initial group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:px-0.5",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline]/tabs-list:data-[state=active]:shadow-none",
        "group-data-[variant=underline]/tabs-list:after:absolute group-data-[variant=underline]/tabs-list:after:inset-x-0 group-data-[variant=underline]/tabs-list:after:bottom-0 group-data-[variant=underline]/tabs-list:after:h-0.5 group-data-[variant=underline]/tabs-list:after:rounded-full group-data-[variant=underline]/tabs-list:after:bg-primary",
        "group-data-[variant=underline]/tabs-list:after:scale-x-0 group-data-[variant=underline]/tabs-list:after:transition-transform group-data-[variant=underline]/tabs-list:after:duration-200 motion-reduce:after:transition-none",
        "group-data-[variant=underline]/tabs-list:data-[state=active]:after:scale-x-100",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsVariant };
