"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Command as CommandPrimitive } from "cmdk";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  UserCheck, Briefcase, Ticket,
  Search, Loader2, ArrowRight, History, Rows3, LogOut,
} from "lucide-react";
import {
  CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { getNavGroupsForRole } from "./sidebar/sidebar-nav-items";
import { THEME_OPTIONS, useMountedTheme } from "./theme-toggle";
import { cn } from "@/lib/utils";


interface SearchResult {
  id: number | string;
  type: "ticket" | "project" | "employee";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

interface RecentRoute {
  href: string;
  label: string;
}

// The searchable kinds in an HR product. Leads, deals, contacts and clients
// were left over from the CRM the app grew out of (QA-D004).
const ENTITY_ICONS = {
  ticket: Ticket,
  project: Briefcase,
  employee: UserCheck,
} as const;

const ENTITY_LABELS = {
  ticket: "Tickets",
  project: "Projects",
  employee: "People",
} as const;

const SEARCH_DEBOUNCE_MS = 400;
const MIN_ENTITY_SEARCH_LENGTH = 3;
const RECENT_KEY = "cmdk-recent";
const RECENT_LIMIT = 5;

/** Window event other components (e.g. the topbar search button) dispatch to open the palette. */
export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette";

function readRecent(): RecentRoute[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as RecentRoute[]).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function pushRecent(entry: RecentRoute) {
  try {
    const next = [entry, ...readRecent().filter((r) => r.href !== entry.href)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — recents are a convenience only
  }
}

const ITEM_CLASS = cn(
  "group gap-2.5 px-2",
  "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0",
  "data-[selected=true]:before:opacity-100",
);

function ItemIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors duration-150 group-data-[selected=true]:text-foreground">
      <Icon />
    </span>
  );
}

function ItemArrow() {
  return (
    <ArrowRight className="text-subtle-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
  );
}


export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recent, setRecent] = useState<RecentRoute[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setTheme } = useMountedTheme();
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
    const openFromEvent = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openFromEvent);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openFromEvent);
    };
  }, []);

  // Record visits to known nav pages, however they were reached.
  useEffect(() => {
    const page = pages.find((p) => p.href === pathname);
    if (page) pushRecent({ href: page.href, label: page.name });
  }, [pathname, pages]);

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

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

  const reset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setEntityResults([]);
  }, []);

  const handleSelect = useCallback((href: string, label?: string) => {
    if (label) pushRecent({ href, label });
    reset();
    router.push(href);
  }, [router, reset]);

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

  const entityGroups = useMemo(() =>
    entityResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    }, {}),
    [entityResults]
  );

  const quickNavPages = useMemo(() => {
    const groups = getNavGroupsForRole(role);
    const seen = new Set<string>();
    return groups.slice(0, 5).flatMap((group) =>
      group.routes
        .filter((r) => {
          if (seen.has(r.href)) return false;
          seen.add(r.href);
          return true;
        })
        .slice(0, 4)
        .map((r) => ({ name: r.label, href: r.href, icon: r.icon, group: group.label }))
    );
  }, [role]);

  const actions = useMemo(() => [
    ...THEME_OPTIONS.map(({ value, label, icon }) => ({
      id: `theme-${value}`,
      label: `Theme: ${label}`,
      icon,
      run: () => setTheme(value),
    })),
    {
      id: "density",
      label: "Toggle compact density",
      icon: Rows3,
      run: () => document.documentElement.classList.toggle("compact"),
    },
    {
      id: "sign-out",
      label: "Sign out",
      icon: LogOut,
      run: () => signOut({ callbackUrl: "/signin" }),
    },
  ], [setTheme]);

  const filteredActions = useMemo(() => {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, actions]);

  const navPages = query ? filteredPages : quickNavPages;
  const hasResults = filteredPages.length > 0 || entityResults.length > 0 || filteredActions.length > 0;
  const isPendingEntitySearch =
    query.trim().length >= MIN_ENTITY_SEARCH_LENGTH && !searchSettled;
  const showEntityLoading = isSearching || isPendingEntitySearch;
  const showEmpty =
    searchSettled &&
    normalizedDebouncedQuery.length >= MIN_ENTITY_SEARCH_LENGTH &&
    !showEntityLoading &&
    !hasResults;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>
        <CommandPrimitive
          shouldFilter={false}
          className="flex h-auto min-h-0 w-full flex-col overflow-hidden rounded-xl bg-surface-raised text-popover-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:text-base"
        >
          <div className="relative">
            <CommandInput
              placeholder="Search pages, people, projects, tickets…"
              value={query}
              onValueChange={setQuery}
              className="pr-20"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {showEntityLoading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
              )}
              <Kbd>Esc</Kbd>
            </div>
          </div>

          <CommandList className="max-h-[min(420px,60vh)] p-1">

            {showEmpty && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Search className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No results for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-muted-foreground">Try a page name, lead, deal, or contact</p>
                </div>
              </CommandEmpty>
            )}

            {!query && recent.length > 0 && (
              <CommandGroup heading="Recent">
                {recent.map((item) => (
                  <CommandItem
                    key={`recent-${item.href}`}
                    value={`recent ${item.href}`}
                    onSelect={() => handleSelect(item.href, item.label)}
                    className={ITEM_CLASS}
                  >
                    <ItemIcon icon={History} />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ItemArrow />
                  </CommandItem>
                ))}
              </CommandGroup>
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
                      className={ITEM_CLASS}
                    >
                      <ItemIcon icon={Icon} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{item.subtitle}</p>
                      </div>
                      {item.status && (
                        <Badge variant="secondary" className="shrink-0">{item.status}</Badge>
                      )}
                      <ItemArrow />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {entityResults.length > 0 && navPages.length > 0 && <CommandSeparator />}

            {navPages.length > 0 && (
              <CommandGroup heading="Navigation">
                {navPages.map((page) => (
                  <CommandItem
                    key={page.href}
                    value={`${page.name} ${page.group} ${page.href}`}
                    onSelect={() => handleSelect(page.href, page.name)}
                    className={ITEM_CLASS}
                  >
                    <ItemIcon icon={page.icon} />
                    <span className="flex-1 truncate">{page.name}</span>
                    <span className="shrink-0 text-2xs text-subtle-foreground">{page.group}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredActions.length > 0 && (
              <CommandGroup heading="Actions">
                {filteredActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`action ${action.label}`}
                    onSelect={() => {
                      reset();
                      action.run();
                    }}
                    className={ITEM_CLASS}
                  >
                    <ItemIcon icon={action.icon} />
                    <span className="flex-1 truncate">{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          <div className="flex h-9 items-center justify-between gap-3 border-t border-border px-3 text-2xs text-muted-foreground">
            <div className="hidden items-center gap-1.5 sm:flex">
              <Kbd>↑↓</Kbd>
              <span>navigate</span>
              <span aria-hidden>·</span>
              <Kbd>↵</Kbd>
              <span>open</span>
              <span aria-hidden>·</span>
              <Kbd>esc</Kbd>
              <span>close</span>
            </div>
            <span className="ml-auto tabular-nums">
              {query.trim().length >= MIN_ENTITY_SEARCH_LENGTH
                ? showEntityLoading ? "Searching…" : `${entityResults.length} records`
                : `${pages.length} pages`}
            </span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
