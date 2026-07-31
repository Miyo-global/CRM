"use client";

import { memo, useCallback } from "react";
import { Pencil, Play, Pause, Trophy, Trash2, Users, BarChart2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AbTest } from "@/lib/api/hooks/marketing";
import { ComparisonBar } from "./comparison-bar";
import { STATUS_BADGE, calcOpenRate, calcClickRate, formatDate } from "./helpers";

export interface TestCardProps {
  test: AbTest;
  onEdit: (test: AbTest) => void;
  onStart: (test: AbTest) => void;
  onStop: (test: AbTest) => void;
  onDeclareWinner: (test: AbTest) => void;
  onDelete: (id: number) => void;
}

export const TestCard = memo(function TestCard({
  test,
  onEdit,
  onStart,
  onStop,
  onDeclareWinner,
  onDelete,
}: TestCardProps) {
  const badge = STATUS_BADGE[test.status] ?? STATUS_BADGE.draft;
  const openRateA = calcOpenRate(test.variantAOpens, test.variantASent);
  const openRateB = calcOpenRate(test.variantBOpens, test.variantBSent);
  const clickRateA = calcClickRate(test.variantAClicks, test.variantASent);
  const clickRateB = calcClickRate(test.variantBClicks, test.variantBSent);
  const maxOpenRate = Math.max(openRateA, openRateB, 0.1);
  const maxClickRate = Math.max(clickRateA, clickRateB, 0.1);
  const showMetrics =
    test.status === "running" || test.status === "completed" || test.status === "paused";

  const handleEdit = useCallback(() => onEdit(test), [onEdit, test]);
  const handleStart = useCallback(() => onStart(test), [onStart, test]);
  const handleStop = useCallback(() => onStop(test), [onStop, test]);
  const handleDeclareWinner = useCallback(() => onDeclareWinner(test), [onDeclareWinner, test]);
  const handleDelete = useCallback(() => onDelete(test.id), [onDelete, test.id]);

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">{test.name}</p>
            {test.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{test.description}</p>
            )}
          </div>
          <Badge variant={badge.variant} className="shrink-0 text-[10px]">
            {badge.label}
          </Badge>
        </div>
      </div>

      {/* Variant subjects */}
      <div className="px-4 py-3 space-y-1 border-b border-border/60">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 shrink-0 w-4">
            A:
          </span>
          {test.variantASubject ? (
            <p className="text-xs text-foreground truncate">{test.variantASubject}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic truncate">No subject</p>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-blue shrink-0 w-4">
            B:
          </span>
          {test.variantBSubject ? (
            <p className="text-xs text-foreground truncate">{test.variantBSubject}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic truncate">No subject</p>
          )}
        </div>
      </div>

      {/* Metrics */}
      {showMetrics && (
        <div className="px-4 py-3 space-y-3 border-b border-border/60">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Open Rate
            </p>
            <ComparisonBar
              label="A"
              rate={openRateA}
              maxRate={maxOpenRate}
              isWinner={test.winnerVariant === "A"}
            />
            <ComparisonBar
              label="B"
              rate={openRateB}
              maxRate={maxOpenRate}
              isWinner={test.winnerVariant === "B"}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Click Rate
            </p>
            <ComparisonBar
              label="A"
              rate={clickRateA}
              maxRate={maxClickRate}
              isWinner={test.winnerVariant === "A"}
            />
            <ComparisonBar
              label="B"
              rate={clickRateB}
              maxRate={maxClickRate}
              isWinner={test.winnerVariant === "B"}
            />
          </div>
        </div>
      )}

      {/* Footer meta */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-b border-border/60">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {test.audienceSize.toLocaleString()} recipients
        </span>
        <span className="flex items-center gap-1">
          <BarChart2 className="h-3 w-3" />
          {test.splitPercent}/{100 - test.splitPercent} split
        </span>
        {test.startedAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Started {formatDate(test.startedAt)}
          </span>
        )}
        {test.endedAt && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ended {formatDate(test.endedAt)}
          </span>
        )}
        {test.winnerVariant && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
            <Trophy className="h-3 w-3" />
            Variant {test.winnerVariant} wins
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={handleEdit}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        {test.status === "draft" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-emerald-600"
            onClick={handleStart}
          >
            <Play className="h-3 w-3" />
            Start
          </Button>
        )}
        {test.status === "running" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-amber-600"
              onClick={handleStop}
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-blue"
              onClick={handleDeclareWinner}
            >
              <Trophy className="h-3 w-3" />
              Declare Winner
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-destructive ml-auto"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
});
