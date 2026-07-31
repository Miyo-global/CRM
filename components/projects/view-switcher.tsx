"use client";

import { LayoutGrid, List, Table2, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "board" | "list" | "table" | "calendar" | "gantt";

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: { type: ViewType; icon: typeof LayoutGrid; label: string }[] = [
  { type: "board", icon: LayoutGrid, label: "Board" },
  { type: "list", icon: List, label: "List" },
  { type: "table", icon: Table2, label: "Table" },
  { type: "calendar", icon: Calendar, label: "Calendar" },
  { type: "gantt", icon: BarChart3, label: "Gantt" },
];

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {views.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onViewChange(type)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
            activeView === type
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
