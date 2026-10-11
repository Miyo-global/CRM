"use client";

import { LayoutGrid, List, Table2, Calendar, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

/** Segmented view toggle (§6.3 toolbar). Labels collapse to icons below `sm`. */
export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <Tabs
      value={activeView}
      onValueChange={(v) => onViewChange(v as ViewType)}
      className="shrink-0"
    >
      <TabsList className="w-fit">
        {views.map(({ type, icon: Icon, label }) => (
          <TabsTrigger key={type} value={type} aria-label={label} className="px-2.5 text-xs">
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
