"use client";

import {
  Clock,
  FileText,
  LayoutTemplate,
  Library,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  KB_PRIVATE,
  KB_SHARED,
  KB_SPACES,
  KB_TEMPLATES,
  KB_TRASH,
  KNOWLEDGE_BASE,
} from "@/lib/knowledge/routes";
import { cn } from "@/lib/utils";

interface WikiNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Wiki home shows Recent and Favourites through ?view=. */
  view?: string;
}

/**
 * KB-0068: the fixed part of the wiki sidebar, above the page tree. Search is
 * the Quick find button in the chrome above (⌘K), not a page (R3-KB-01).
 */
const ITEMS: WikiNavItem[] = [
  { label: "Wiki home", href: KNOWLEDGE_BASE, icon: FileText },
  { label: "Recent", href: `${KNOWLEDGE_BASE}?view=recent`, icon: Clock, view: "recent" },
  {
    label: "Favourites",
    href: `${KNOWLEDGE_BASE}?view=favourites`,
    icon: Star,
    view: "favourites",
  },
  { label: "My pages", href: KB_PRIVATE, icon: Library },
  { label: "Shared with me", href: KB_SHARED, icon: Share2 },
  { label: "Spaces", href: KB_SPACES, icon: Library },
  { label: "Templates", href: KB_TEMPLATES, icon: LayoutTemplate },
];

function itemClass(active: boolean): string {
  return cn(
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    active
      ? "bg-surface-sunken font-medium text-foreground"
      : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
  );
}

export function WikiSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const view = useSearchParams()?.get("view") ?? null;

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Knowledge base">
      {ITEMS.map((item) => {
        const href = item.href.split("?")[0];
        // Three items share the wiki-home path and differ only by ?view=, and
        // wiki home itself would otherwise look active on every page under it.
        const active =
          href === KNOWLEDGE_BASE
            ? pathname === href && view === (item.view ?? null)
            : pathname.startsWith(href);
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={itemClass(active)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Trash sits at the bottom of the sidebar, away from the everyday items. */
export function WikiSidebarTrashLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <Link
      href={KB_TRASH}
      onClick={onNavigate}
      className={itemClass(pathname.startsWith(KB_TRASH))}
    >
      <Trash2 className="h-4 w-4 shrink-0" />
      Trash
    </Link>
  );
}
