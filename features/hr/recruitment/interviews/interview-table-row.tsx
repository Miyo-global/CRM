"use client";

import { memo, useCallback } from "react";
import { format } from "date-fns";

import type { Interview } from "@/types/hr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "PPp");
}

function resultBadgeVariant(result: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (result) {
    case "PASSED": return "default";
    case "FAILED": return "destructive";
    case "NO_SHOW": return "destructive";
    default: return "outline";
  }
}

type InterviewWithPanel = Interview & { panelInterviewerIds?: string[] | null };

interface InterviewTableRowProps {
  interview: InterviewWithPanel;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onFeedbackClick: (interview: Interview) => void;
}

export const InterviewTableRow = memo(function InterviewTableRow({
  interview,
  isSelected,
  onToggleSelect,
  onFeedbackClick,
}: InterviewTableRowProps) {
  const handleToggle = useCallback(
    () => onToggleSelect(interview.id),
    [interview.id, onToggleSelect]
  );

  const handleFeedback = useCallback(
    () => onFeedbackClick(interview),
    [interview, onFeedbackClick]
  );

  return (
    <TableRow className={isSelected ? "bg-primary/5" : undefined}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggle}
          aria-label={`Select interview ${interview.id}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        {interview.candidate?.firstName} {interview.candidate?.lastName}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">{interview.type}</Badge>
          {interview.panelInterviewerIds && interview.panelInterviewerIds.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">
              Panel ({interview.panelInterviewerIds.length})
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {fmtDateTime(interview.scheduledAt)}
      </TableCell>
      <TableCell className="text-sm">{interview.duration} min</TableCell>
      <TableCell>
        <Badge variant={resultBadgeVariant(interview.result)}>{interview.result}</Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleFeedback}
        >
          Feedback
        </Button>
      </TableCell>
    </TableRow>
  );
});
