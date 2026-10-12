"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Contact2, Handshake, LifeBuoy, Menu, Plus, Search, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Breadcrumbs, useAutoBreadcrumbs } from "@/components/ui/breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navHrefPath, type NavGroup } from "./sidebar/sidebar-nav-items";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { openCommandPalette } from "./shortcuts-provider";

/** Links to the existing pages where each record is created. Shown only when the role's nav contains the href. */
const CREATE_ITEMS = [
  { label: "New lead", href: "/crm/leads", icon: Contact2 },
  { label: "New deal", href: "/crm/deals", icon: Handshake },
  { label: "New ticket", href: "/support", icon: LifeBuoy },
  { label: "Log time", href: "/timesheets", icon: Timer },
  { label: "Apply leave", href: "/hr/leaves", icon: CalendarCheck },
] as const;

interface TopbarProps {
  navGroups: NavGroup[];
  onOpenMobileNav: () => void;
}

export function Topbar({ navGroups, onOpenMobileNav }: TopbarProps) {
  const crumbs = useAutoBreadcrumbs();

  const createItems = useMemo(() => {
    const paths = new Set(navGroups.flatMap((g) => g.routes.map((r) => navHrefPath(r.href))));
    return CREATE_ITEMS.filter((item) => paths.has(item.href));
  }, [navGroups]);

  return (
    <header className="sticky top-0 z-topbar flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
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

      {/* Desktop */}
      <Breadcrumbs items={crumbs} className="hidden lg:block" />

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
        className="hidden h-9 w-72 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-subtle-foreground shadow-xs transition-colors hover:border-border-strong hover:text-muted-foreground outline-none focus-visible:focus-ring lg:flex"
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
          <DropdownMenuContent align="end" className="w-48">
            {createItems.map(({ label, href, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild>
                <Link href={href}>
                  <Icon />
                  {label}
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
