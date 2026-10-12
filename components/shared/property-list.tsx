import * as React from "react";

import { cn } from "@/lib/utils";

interface PropertyListProps {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}

/** Label/value grid for detail rails (§6.3). Empty values render an em dash. */
function PropertyList({ items, className }: PropertyListProps) {
  return (
    <dl className={cn("grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 text-sm", className)}>
      {items.map(({ label, value }) => (
        <React.Fragment key={label}>
          <dt className="truncate text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-foreground">
            {value ?? <span className="text-subtle-foreground">—</span>}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export { PropertyList };
export type { PropertyListProps };
