import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

interface ListToolbarProps {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  filters?: React.ReactNode;
  view?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** List-page toolbar (§6.3): search (`/` focuses it) → filters → spacer → view toggle → actions. */
function ListToolbar({ search, filters, view, actions, className }: ListToolbarProps) {
  const placeholder = search?.placeholder ?? "Search…";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {search && (
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            data-page-search
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="pl-9 pr-9"
          />
          <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true">
            /
          </Kbd>
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      {(view || actions) && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view}
          {actions}
        </div>
      )}
    </div>
  );
}

export { ListToolbar };
export type { ListToolbarProps };
