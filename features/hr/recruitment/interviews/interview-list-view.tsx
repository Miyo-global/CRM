"use client";

import { memo, useCallback } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import type { Interview } from "@/types/hr";
import { useUpdateInterview, useBulkRescheduleInterviews } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { InterviewTableRow } from "@/features/hr/recruitment/interviews/interview-table-row";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface InterviewListViewProps {
  interviews: Interview[];
  selectedIds: Set<number>;
  bulkNewDate: string;
  onBulkNewDateChange: (date: string) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onFeedbackClick: (interview: Interview) => void;
}

export const InterviewListView = memo(function InterviewListView({
  interviews,
  selectedIds,
  bulkNewDate,
  onBulkNewDateChange,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onFeedbackClick,
}: InterviewListViewProps) {
  const updateInterview = useUpdateInterview();
  void updateInterview;

  const bulkReschedule = useBulkRescheduleInterviews();

  const handleBulkNewDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onBulkNewDateChange(e.target.value),
    [onBulkNewDateChange]
  );

  const handleBulkReschedule = useCallback(() => {
    if (!bulkNewDate) { toast.error("Select a new date first"); return; }
    if (selectedIds.size === 0) return;
    bulkReschedule.mutate(
      { ids: Array.from(selectedIds), scheduledAt: new Date(bulkNewDate).toISOString() },
      {
        onSuccess: (data) => {
          toast.success(
            `${data.rescheduled} interview${data.rescheduled !== 1 ? "s" : ""} rescheduled`
          );
          onClearSelection();
          onBulkNewDateChange("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [bulkNewDate, selectedIds, bulkReschedule, onClearSelection, onBulkNewDateChange]);

  const handleClearAndReset = useCallback(() => {
    onClearSelection();
    onBulkNewDateChange("");
  }, [onClearSelection, onBulkNewDateChange]);

  return (
    <>
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 mb-2">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Input
              type="datetime-local"
              className="h-8 text-xs w-52"
              value={bulkNewDate}
              onChange={handleBulkNewDateChange}
              placeholder="New date & time"
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleBulkReschedule}
              disabled={bulkReschedule.isPending || !bulkNewDate}
            >
              {bulkReschedule.isPending ? "Rescheduling..." : "Reschedule Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearAndReset}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={!!interviews.length && selectedIds.size === interviews.length}
                        onCheckedChange={onToggleSelectAll}
                        aria-label="Select all interviews"
                      />
                    </TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <EmptyCalendarIllustration className="h-36 w-36 opacity-95" />
                          <p>No interviews scheduled.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    interviews.map((interview) => (
                      <InterviewTableRow
                        key={interview.id}
                        interview={interview}
                        isSelected={selectedIds.has(interview.id)}
                        onToggleSelect={onToggleSelect}
                        onFeedbackClick={onFeedbackClick}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
});
