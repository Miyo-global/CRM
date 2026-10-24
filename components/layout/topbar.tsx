"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, HeadphonesIcon, LifeBuoy, Menu, Plus, Search, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Breadcrumbs, useAutoBreadcrumbs } from "@/components/ui/breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getActiveModule,
  getModules,
  navHrefPath,
  type NavGroup,
} from "./sidebar/sidebar-nav-items";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { openCommandPalette } from "./shortcuts-provider";

/**
 * Global Create targets.
 *
 * Each link opens the create form on arrival; they used to land on the page
 * (support analytics with no form) or do nothing at all (QA-0039). `navHref`
 * is the plain page path used to decide whether the role's menu has it.
 */
const CREATE_ITEMS = [
  // MIYO-0173: the lead and deal entries pointed at /crm/leads and
  // /crm/deals, which were removed with the CRM module and 404.
  // BUG-13: the two ticket systems say what each one is for.
  {
    label: "HR Helpdesk ticket",
    description: "Ask HR about payroll, leave, policy or equipment",
    navHref: "/hr/helpdesk",
    href: "/hr/helpdesk?new=1",
    icon: HeadphonesIcon,
  },
  {
    label: "Customer support ticket",
    description: "Log a client issue: technical, billing, access",
    navHref: "/support",
    href: "/support/inbox?new=1",
    icon: LifeBuoy,
  },
  { label: "Log time", navHref: "/timesheets", href: "/timesheets?new=1", icon: Timer },
  { label: "Apply for leave", navHref: "/hr/leaves", href: "/hr/leaves?apply=leave", icon: CalendarCheck },
] as const;

/** Modules shown inline below 2xl; the rest sit in the More menu. */
const INLINE_MODULES = 3;

interface TopbarProps {
  navGroups: NavGroup[];
  onOpenMobileNav: () => void;
}

export function Topbar({ navGroups, onOpenMobileNav }: TopbarProps) {
  const crumbs = useAutoBreadcrumbs();
  const pathname = usePathname();

  // The modules live up here; the sidebar lists the pages of the one you are
  // in (B5).
  const modules = useMemo(() => getModules(navGroups), [navGroups]);
  const activeModule = useMemo(
    () => getActiveModule(pathname, navGroups),
    [pathname, navGroups],
  );

  const overflowModules = modules.slice(INLINE_MODULES);
  const activeOverflow = overflowModules.find((m) => m.label === activeModule);

  const createItems = useMemo(() => {
    const paths = new Set(navGroups.flatMap((g) => g.routes.map((r) => navHrefPath(r.href))));
    return CREATE_ITEMS.filter((item) => paths.has(item.navHref));
  }, [navGroups]);

  return (
    <header className="sticky top-0 z-topbar flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      {/* Mobile / tablet */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Menu strokeWidth={1.75} />
      </Button>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-md outline-none focus-visible:focus-ring lg:hidden"
      >
        <Image src="/logo.svg" alt="" width={24} height={24} className="size-6" />
        <span className="font-display text-sm font-bold text-foreground">Miyo Global</span>
      </Link>

      {/* Desktop. Under 2xl only the first modules fit next to search and
          Create; the rest go in a More menu instead of wrapping (R3-RSP-01). */}
      <nav aria-label="Modules" className="hidden shrink-0 items-center gap-1 lg:flex">
        {modules.map((mod, i) => (
          <Link
            key={mod.label}
            href={mod.href}
            aria-current={mod.label === activeModule ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:focus-ring",
              i >= INLINE_MODULES && "hidden 2xl:inline-block",
              mod.label === activeModule
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mod.label}
          </Link>
        ))}
        {overflowModules.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:focus-ring 2xl:hidden",
                activeOverflow ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeOverflow?.label ?? "More"}
              <ChevronDown className="size-3.5 opacity-70" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {overflowModules.map((mod) => (
                <DropdownMenuItem
                  key={mod.label}
                  asChild
                  className={cn(mod.label === activeModule && "bg-accent font-medium")}
                >
                  <Link href={mod.href} aria-current={mod.label === activeModule ? "page" : undefined}>
                    {mod.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      <Breadcrumbs items={crumbs} className="hidden xl:block" />

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={openCommandPalette}
        aria-label="Search"
        className="text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Search strokeWidth={1.75} />
      </Button>
      <button
        type="button"
        onClick={openCommandPalette}
        className="hidden h-9 w-48 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-subtle-foreground shadow-xs transition-colors hover:border-border-strong hover:text-muted-foreground outline-none focus-visible:focus-ring lg:flex xl:w-72"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate text-left">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      {createItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="hidden lg:inline-flex">
              <Plus />
              Create
              <ChevronDown className="-mr-0.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {createItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.icon />
                  <span className="min-w-0">
                    {item.label}
                    {"description" in item && (
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <NotificationBell />
      <ThemeToggle className="hidden lg:inline-flex" />
    </header>
  );
}
