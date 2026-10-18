"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useKbPageSearch } from "@/lib/api/hooks/knowledge";
import { pageHref } from "@/lib/knowledge/routes";

/** Long enough that one keystroke does not search, short enough to feel live. */
const QUICK_FIND_DEBOUNCE_MS = 250;

/**
 * KB-0068: ⌘K / Ctrl+K quick find.
 *
 * Titles only, by design: the full search page does snippets and filters. This
 * is for jumping to a page you already know the name of.
 */
export function QuickFindDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, QUICK_FIND_DEBOUNCE_MS);
  const { data, isFetching } = useKbPageSearch({ q: debounced, limit: 10 }, { enabled: open });

  const results = data?.items ?? [];

  function open_(pageId: number) {
    onOpenChange(false);
    setQuery("");
    router.push(pageHref(pageId));
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Find a page…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Nothing is said while a search is still in flight: "No pages" that
            turns into results reads as a wrong answer. */}
        {!isFetching && debounced.trim().length > 0 && results.length === 0 ? (
          <CommandEmpty>No pages match “{debounced.trim()}”.</CommandEmpty>
        ) : null}
        {results.length > 0 ? (
          <CommandGroup heading="Pages">
            {results.map((hit) => (
              <CommandItem
                key={hit.id}
                value={String(hit.id)}
                onSelect={() => open_(hit.id)}
                className="gap-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{hit.title}</span>
                {hit.spaceName ? (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {hit.spaceName}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
