"use client";

import { memo, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type SocialMetric } from "@/lib/api/hooks/marketing";

const PLATFORM_BADGE: Record<string, string> = {
  linkedin: "text-blue-700 bg-blue-50 border-blue-200",
  twitter: "text-sky-700 bg-sky-50 border-sky-200",
  instagram: "text-pink-700 bg-pink-50 border-pink-200",
  facebook: "text-indigo-700 bg-indigo-50 border-indigo-200",
  youtube: "text-red-700 bg-red-50 border-red-200",
};

interface MetricRowProps {
  metric: SocialMetric;
  onDelete: (id: number) => void;
}

export const MetricRow = memo(function MetricRow({
  metric,
  onDelete,
}: MetricRowProps) {
  const handleDelete = useCallback(() => {
    onDelete(metric.id);
  }, [metric.id, onDelete]);

  const parsedDate = metric.metricDate ? parseISO(metric.metricDate) : null;
  const formattedDate =
    parsedDate && isValid(parsedDate) ? format(parsedDate, "dd MMM yyyy") : metric.metricDate;

  return (
    <TableRow>
      <TableCell className="text-sm font-medium">{formattedDate}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn("text-xs capitalize", PLATFORM_BADGE[metric.platform] ?? "")}
        >
          {metric.platform}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-right">
        {metric.followers.toLocaleString()}
      </TableCell>
      <TableCell className="text-sm text-right">
        {metric.impressions.toLocaleString()}
      </TableCell>
      <TableCell className="text-sm text-right">
        {metric.engagements.toLocaleString()}
      </TableCell>
      <TableCell className="text-sm text-right">
        {metric.clicks.toLocaleString()}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          aria-label={`Delete metric entry from ${formattedDate}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </TableCell>
    </TableRow>
  );
});
