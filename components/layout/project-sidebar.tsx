"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ListTodo,
  Settings,
  KanbanSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  Layers,
  Calendar,
  RefreshCcw,
  Package,
  GanttChart,
  FileText,
  BarChart3,
  Inbox,
  User,
  Diamond,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
  projectKey: string;
}

interface NavSection {
  label: string;
  items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
  }[];
}

function useSections(baseUrl: string): NavSection[] {
  return [
    {
      label: "Planning",
      items: [
        { label: "Board", icon: KanbanSquare, href: baseUrl },
        { label: "Backlog", icon: ListTodo, href: `${baseUrl}/backlog` },
        { label: "My Tickets", icon: User, href: `${baseUrl}/my-tickets` },
        { label: "Sprints", icon: Calendar, href: `${baseUrl}/sprints` },
      ],
    },
    {
      label: "Tracking",
      items: [
        { label: "Cycles", icon: RefreshCcw, href: `${baseUrl}/cycles` },
        { label: "Modules", icon: Package, href: `${baseUrl}/modules` },
        { label: "Epics", icon: Layers, href: `${baseUrl}/epics` },
        { label: "Timeline", icon: GanttChart, href: `${baseUrl}/timeline` },
        { label: "Milestones", icon: Diamond, href: `${baseUrl}/milestones` },
      ],
    },
    {
      label: "More",
      items: [
        { label: "Wiki", icon: FileText, href: `${baseUrl}/pages` },
        { label: "Reports", icon: BarChart3, href: `${baseUrl}/analytics` },
        { label: "Budget", icon: DollarSign, href: `${baseUrl}/budget` },
        { label: "Intake", icon: Inbox, href: `${baseUrl}/intake` },
        { label: "Settings", icon: Settings, href: `${baseUrl}/settings` },
      ],
    },
  ];
}

function useIsActive(baseUrl: string) {
  const pathname = usePathname();
  return (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    return pathname === href || pathname?.startsWith(href + "/");
  };
}

function DesktopSidebar({
  projectId,
  projectName,
  projectKey,
}: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const baseUrl = `/projects/${projectId}`;
  const sections = useSections(baseUrl);
  const isActive = useIsActive(baseUrl);

  return (
    <div
      className={cn(
        "h-full flex flex-col border-r bg-muted/30 transition-[width] duration-200 ease-out",
        isCollapsed ? "w-[3.25rem]" : "w-52"
      )}
    >

      <div className={cn("shrink-0 border-b", isCollapsed ? "p-1.5" : "px-3 py-2.5")}>
        <Link
          href="/projects"
          className={cn(
            "flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors",
            isCollapsed ? "justify-center mb-1.5" : "mb-2"
          )}
        >
          <ChevronLeft className="h-3 w-3 shrink-0" />
          {!isCollapsed && <span className="ml-1">Projects</span>}
        </Link>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
          <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
            {projectKey.substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <span className="text-sm font-semibold truncate">{projectName}</span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("py-1.5", isCollapsed ? "px-1" : "px-1.5")}>
          {sections.map((section, si) => (
            <div key={section.label}>
              {si > 0 && <div className="my-1.5 mx-1 border-t" />}
              {!isCollapsed && (
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md text-[13px] font-medium transition-colors group relative",
                      isCollapsed ? "justify-center p-1.5 mx-auto" : "px-2 py-1.5",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed((c) => !c)}
          className={cn(
            "w-full h-7 text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function MobileProjectNav({
  projectId,
  projectName,
  projectKey,
}: ProjectSidebarProps) {
  const [open, setOpen] = useState(false);
  const baseUrl = `/projects/${projectId}`;
  const sections = useSections(baseUrl);
  const isActive = useIsActive(baseUrl);
  const pathname = usePathname();

  const allItems = sections.flatMap((s) => s.items);
  const current = allItems.find((i) => isActive(i.href));

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 bg-background">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Open project menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Project Navigation</SheetTitle>
          <div className="flex flex-col h-full">

            <div className="px-3 py-3 border-b">
              <Link
                href="/projects"
                className="flex items-center text-xs text-muted-foreground hover:text-foreground mb-2"
                onClick={() => setOpen(false)}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Projects
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                  {projectKey.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold truncate">{projectName}</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-1.5 px-1.5">
                {sections.map((section, si) => (
                  <div key={section.label}>
                    {si > 0 && <div className="my-1.5 mx-1 border-t" />}
                    <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.label}
                    </p>
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center px-2 py-2 rounded-md text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-1.5 min-w-0 text-sm">
        <Link href={`/projects/${projectId}`} className="font-semibold text-foreground shrink-0">
          {projectKey}
        </Link>
        {current && pathname !== baseUrl && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{current.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  return (
    <>

      <div className="hidden md:flex h-full">
        <DesktopSidebar {...props} />
      </div>

      <div className="md:hidden">
        <MobileProjectNav {...props} />
      </div>
    </>
  );
}
