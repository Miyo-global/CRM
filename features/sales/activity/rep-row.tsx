"use client";

import { memo } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface RepActivity {
  userId: string;
  name: string | null;
  role: string | null;
  calls: number;
  emails: number;
  meetings: number;
  whatsapp: number;
  other: number;
  total: number;
  dealActivities: number;
}

interface RepRowProps {
  rep: RepActivity;
  isTop: boolean;
}

export const RepRow = memo(function RepRow({ rep, isTop }: RepRowProps) {
  const grandTotal = rep.total + rep.dealActivities;

  return (
    <TableRow
      className={cn(isTop && "bg-amber-50/40 dark:bg-amber-900/10")}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {rep.name ?? "Unknown"}
          </span>
          {isTop && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0"
            >
              <Trophy className="h-3 w-3" aria-hidden="true" />
              Top Performer
            </Badge>
          )}
          {rep.role && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {rep.role}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{rep.calls}</TableCell>
      <TableCell className="text-right tabular-nums">{rep.emails}</TableCell>
      <TableCell className="text-right tabular-nums">{rep.meetings}</TableCell>
      <TableCell className="text-right tabular-nums">{rep.whatsapp}</TableCell>
      <TableCell className="text-right tabular-nums">{rep.other}</TableCell>
      <TableCell className="text-right tabular-nums">
        {rep.dealActivities}
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold">
        {grandTotal}
      </TableCell>
    </TableRow>
  );
});
