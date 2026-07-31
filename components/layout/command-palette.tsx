"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Contact2, Handshake, UserCheck, Briefcase, Ticket,
  Search, Loader2, ArrowRight, Hash,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { getNavGroupsForRole } from "./sidebar/sidebar-nav-items";
import { cn } from "@/lib/utils";


interface SearchResult {
  id: number;
  type: "lead" | "deal" | "contact" | "client" | "ticket";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

const ENTITY_ICONS = {
  lead: Contact2,
  deal: Handshake,
  contact: UserCheck,
  client: Briefcase,
  ticket: Ticket,
} as const;

const ENTITY_LABELS = {
  lead: "Leads",
  deal: "Deals",
  contact: "Contacts",
  client: "Clients",
  ticket: "Tickets",
} as const;

const SEARCH_DEBOUNCE_MS = 400;
const MIN_ENTITY_SEARCH_LENGTH = 3;


function ItemIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
      "bg-muted text-foreground/50",
      "transition-colors duration-150",
      "group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white",
    )}>
      <span className="flex items-center justify-center [&_svg]:!h-4 [&_svg]:!w-4">
        <Icon />
      </span>
    </span>
  );
}


export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const pages = useMemo(() => {
    const groups = getNavGroupsForRole(role);
    const seen = new Set<string>();
    return groups.flatMap((group) =>
      group.routes
        .filter((r) => {
          if (seen.has(r.href)) return false;
          seen.add(r.href);
          return true;
        })
        .map((r) => ({ name: r.label, href: r.href, icon: r.icon, group: group.label }))
    );
  }, [role]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const normalizedDebouncedQuery = debouncedQuery.trim();
  const searchSettled = query.trim() === normalizedDebouncedQuery;

  useEffect(() => {
    if (!normalizedDebouncedQuery || normalizedDebouncedQuery.length < MIN_ENTITY_SEARCH_LENGTH) {
      setEntityResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    apiClient
      .get<{ results: SearchResult[] }>(
        "/search",
        { q: normalizedDebouncedQuery },
        { signal: controller.signal },
      )
      .then((data) => {
        if (!controller.signal.aborted) setEntityResults(data.results);
      })
      .catch((error) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setEntityResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });

    return () => controller.abort();
  }, [normalizedDebouncedQuery]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setEntityResults([]);
    router.push(href);
  }, [router]);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) {
      setQuery("");
      setEntityResults([]);
    }
  }, []);

  const filteredPages = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return pages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
    );
  }, [query, pages]);

  const pageGroups = useMemo(() =>
    filteredPages.reduce<Record<string, typeof filteredPages>>((acc, page) => {
      (acc[page.group] ??= []).push(page);
      return acc;
    }, {}),
    [filteredPages]
  );

  const entityGroups = useMemo(() =>
    entityResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    }, {}),
    [entityResults]
  );

  const quickNavGroups = useMemo(() => {
    const groups = getNavGroupsForRole(role);
    const seen = new Set<string>();
    return groups.slice(0, 5).map((group) => ({
      label: group.label,
      routes: group.routes
        .filter((r) => {
          if (seen.has(r.href)) return false;
          seen.add(r.href);
          return true;
        })
        .slice(0, 4),
    }));
  }, [role]);

  const hasResults = filteredPages.length > 0 || entityResults.length > 0;
  const isPendingEntitySearch =
    query.trim().length >= MIN_ENTITY_SEARCH_LENGTH && !searchSettled;
  const showEntityLoading = isSearching || isPendingEntitySearch;
  const showEmpty =
    searchSettled &&
    normalizedDebouncedQuery.length >= MIN_ENTITY_SEARCH_LENGTH &&
    !showEntityLoading &&
    !hasResults;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
      <div className="relative">
        <CommandInput
          placeholder="Search pages, leads, deals, contacts…"
          value={query}
          onValueChange={setQuery}
        />
        {showEntityLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
        )}
      </div>

      <CommandList className="max-h-[420px] px-1 py-1">

        {showEmpty && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground">Try a page name, lead, deal, or contact</p>
            </div>
          </CommandEmpty>
        )}

        {Object.entries(entityGroups).map(([type, items]) => {
          const Icon = ENTITY_ICONS[type as keyof typeof ENTITY_ICONS] ?? Search;
          const label = ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ?? type;
          return (
            <CommandGroup key={`entity-${type}`} heading={label}>
              {items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.title} ${item.subtitle} ${item.type}`}
                  onSelect={() => handleSelect(item.href)}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                >
                  <ItemIcon icon={Icon} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{item.subtitle}</p>
                  </div>
                  {item.status && (
                    <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{item.status}</Badge>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-data-[selected=true]:text-white/70 transition-colors" />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {entityResults.length > 0 && filteredPages.length > 0 && <CommandSeparator className="my-1" />}

        {query && Object.entries(pageGroups).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.name} ${page.group}`}
                onSelect={() => handleSelect(page.href)}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <ItemIcon icon={page.icon} />
                <span className="flex-1 text-sm truncate">{page.name}</span>
                <span className="text-[11px] text-muted-foreground/50 shrink-0 hidden sm:block group-data-[selected=true]:text-muted-foreground transition-colors">
                  {page.href}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-data-[selected=true]:text-white/70 transition-colors" />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {!query && (
          <>
            <div className="px-2 pb-1 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Quick navigation
              </p>
            </div>
            {quickNavGroups.map((group) =>
              group.routes.length > 0 ? (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.routes.map((route) => (
                    <CommandItem
                      key={route.href}
                      value={`${route.label} ${group.label}`}
                      onSelect={() => handleSelect(route.href)}
                      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <ItemIcon icon={route.icon} />
                      <span className="flex-1 text-sm">{route.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 group-data-[selected=true]:text-white/70 transition-colors" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null
            )}
          </>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {pages.length} pages
          </span>
          {query.trim().length >= MIN_ENTITY_SEARCH_LENGTH && (
            <span className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              {showEntityLoading ? "Searching…" : `${entityResults.length} records`}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <kbd className="inline-flex h-4 items-center rounded border bg-background px-1 font-mono text-[10px]">↑↓</kbd>
          <kbd className="inline-flex h-4 items-center rounded border bg-background px-1 font-mono text-[10px]">↵</kbd>
          <span>open</span>
          <kbd className="inline-flex h-4 items-center rounded border bg-background px-1 font-mono text-[10px]">esc</kbd>
        </div>
      </div>
    </CommandDialog>
  );
}
