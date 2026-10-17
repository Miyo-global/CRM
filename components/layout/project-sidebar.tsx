"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ListTodo,
  Settings,
  KanbanSquare,
  ChevronLeft,
  ChevronDown,
  Layers,
  Calendar,
  RefreshCcw,
  Package,
  GanttChart,
  FileText,
  BarChart3,
  Inbox,
  User,
  Users,
  ArrowDownUp,
  Diamond,
  IndianRupee,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
  projectKey: string;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

/** Tabs shown inline on ≥lg; everything after VISIBLE_TABS goes into "More". */
const VISIBLE_TABS = 7;

function navItems(baseUrl: string): NavItem[] {
  return [
    { label: "Board", icon: KanbanSquare, href: baseUrl },
    { label: "Overview", icon: Gauge, href: `${baseUrl}/overview` },
    { label: "Backlog", icon: ListTodo, href: `${baseUrl}/backlog` },
    { label: "Sprints", icon: Calendar, href: `${baseUrl}/sprints` },
    { label: "Cycles", icon: RefreshCcw, href: `${baseUrl}/cycles` },
    { label: "Epics", icon: Layers, href: `${baseUrl}/epics` },
    { label: "Modules", icon: Package, href: `${baseUrl}/modules` },
    { label: "Timeline", icon: GanttChart, href: `${baseUrl}/timeline` },
    { label: "Wiki", icon: FileText, href: `${baseUrl}/pages` },
    { label: "Intake", icon: Inbox, href: `${baseUrl}/intake` },
    { label: "Milestones", icon: Diamond, href: `${baseUrl}/milestones` },
    { label: "Budget", icon: IndianRupee, href: `${baseUrl}/budget` },
    { label: "Reports", icon: BarChart3, href: `${baseUrl}/analytics` },
    { label: "Workload", icon: Users, href: `${baseUrl}/workload` },
    { label: "My Tickets", icon: User, href: `${baseUrl}/my-tickets` },
    { label: "Import / Export", icon: ArrowDownUp, href: `${baseUrl}/import-export` },
    { label: "Settings", icon: Settings, href: `${baseUrl}/settings` },
  ];
}

function useIsActive(baseUrl: string) {
  const pathname = usePathname();
  return (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    return pathname === href || pathname?.startsWith(href + "/");
  };
}

function ProjectMark({ projectKey }: { projectKey: string }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-2xs font-bold text-brand-soft-foreground"
    >
      {projectKey.substring(0, 2).toUpperCase()}
    </span>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-0.5 text-sm font-medium transition-colors duration-150 focus-visible:focus-ring rounded-sm",
    "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform after:duration-200 motion-reduce:after:transition-none",
    active
      ? "text-foreground after:scale-x-100"
      : "text-muted-foreground hover:text-foreground after:scale-x-0",
  );

export function ProjectSidebar({ projectId, projectName, projectKey }: ProjectSidebarProps) {
  const router = useRouter();
  const baseUrl = `/projects/${projectId}`;
  const isActive = useIsActive(baseUrl);
  const items = navItems(baseUrl);
  const settingsHref = `${baseUrl}/settings`;
  const tabItems = items.filter((i) => i.href !== settingsHref);
  const visible = tabItems.slice(0, VISIBLE_TABS);
  const overflow = tabItems.slice(VISIBLE_TABS);
  const activeOverflow = overflow.find((i) => isActive(i.href));
  const current = items.find((i) => isActive(i.href));

  return (
    <div className="shrink-0 border-b border-border bg-background">
      {/* Header: back link, project identity, settings */}
      <div className="flex items-center gap-3 px-4 pt-3 sm:px-6 xl:px-8 lg:pt-4">
        <Link
          href="/projects"
          aria-label="Back to projects"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:focus-ring"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <ProjectMark projectKey={projectKey} />
        <div className="flex min-w-0 items-baseline gap-2">
          <Link
            href={baseUrl}
            className="truncate font-display text-lg font-semibold text-foreground hover:text-brand-text"
          >
            {projectName}
          </Link>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{projectKey}</span>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className={cn("ml-auto", isActive(settingsHref) && "bg-accent text-foreground")}
        >
          <Link href={settingsHref} aria-label="Project settings" title="Project settings">
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>

      {/* ≥lg: underline tab bar */}
      <nav
        aria-label="Project"
        className="hidden items-center gap-6 px-4 sm:px-6 xl:px-8 lg:mt-2 lg:flex"
      >
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={tabClass(isActive(item.href))}
          >
            {item.label}
          </Link>
        ))}
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className={tabClass(Boolean(activeOverflow))}>
              {activeOverflow?.label ?? "More"}
              <ChevronDown className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {overflow.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  asChild
                  className={cn(isActive(item.href) && "bg-accent font-medium")}
                >
                  <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                    <item.icon />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      {/* <lg: section select */}
      <div className="px-4 py-3 sm:px-6 lg:hidden">
        <Select value={current?.href} onValueChange={(href) => router.push(href)}>
          <SelectTrigger aria-label="Project section" className="sm:max-w-xs">
            <SelectValue placeholder="Go to…" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                <item.icon className="size-4 text-muted-foreground" />
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
