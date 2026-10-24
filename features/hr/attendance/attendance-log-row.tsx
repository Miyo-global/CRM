"use client";

import { memo } from "react";
import { formatCalendarDate, formatISTTime } from "@/lib/date-utils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AttendanceLog } from "@/types/hr";
import { tableStatusBadge, formatDuration } from "./attendance-utils";

interface AttendanceLogRowProps {
  log: AttendanceLog;
  index: number;
}

export const AttendanceLogRow = memo(function AttendanceLogRow({ log, index }: AttendanceLogRowProps) {
  const statusKey = log.status || "PRESENT";

  return (
    <TableRow className={index % 2 === 0 ? "bg-card" : "bg-surface-sunken"}>
      <TableCell className="font-medium border border-border px-4 py-2.5">
        {formatCalendarDate(log.date, { weekday: "short", month: "short", day: "2-digit" })}
      </TableCell>
      <TableCell className="font-mono text-sm border border-border px-4 py-2.5">
        {log.checkIn ? formatISTTime(log.checkIn) : "--"}
      </TableCell>
      <TableCell className="font-mono text-sm border border-border px-4 py-2.5">
        {log.checkOut ? formatISTTime(log.checkOut) : "--"}
      </TableCell>
      <TableCell className="border border-border px-4 py-2.5">
        {log.workHours ? formatDuration(log.workHours) : "--"}
      </TableCell>
      <TableCell className="border border-border px-4 py-2.5">
        <Badge
          className={`text-xs font-semibold border-0 ${
            tableStatusBadge[statusKey] || tableStatusBadge.PRESENT
          }`}
        >
          {statusKey === "CHECKED_OUT"
            ? "Checked Out"
            : statusKey === "ON_BREAK"
            ? "On Break"
            : statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
        </Badge>
      </TableCell>
    </TableRow>
  );
});
