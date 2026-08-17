"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, Calendar, MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatINRCompact, formatDealId } from "@/lib/format-utils";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import type { Deal } from "@/types/crm";
import { AIPredictDealButton } from "./ai-predict-deal-button";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

function DealHealthBadge({ expectedCloseDate }: { expectedCloseDate: string | null }) {
  const status = useMemo(() => {
    if (!expectedCloseDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(expectedCloseDate);
    closeDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue" as const;
    if (diffDays < 7) return "due-soon" as const;
    return null;
  }, [expectedCloseDate]);

  if (!status) return null;
  if (status === "overdue") {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Overdue</Badge>;
  }
  return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500 hover:bg-amber-500 text-white">Due soon</Badge>;
}

interface DealKanbanCardProps {
  deal: Deal;
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen?: (id: number) => void;
}

function StageMenuItem({
  stageKey, dot, label, dealId, onStageChange,
}: {
  stageKey: string; dot: string; label: string; dealId: number;
  onStageChange: (id: number, stage: string) => void;
}) {
  const handleClick = useCallback(() => onStageChange(dealId, stageKey), [dealId, stageKey, onStageChange]);
  return (
    <DropdownMenuItem onClick={handleClick}>
      <div className={cn("w-2 h-2 rounded-full mr-2", dot)} />
      Move to {label}
    </DropdownMenuItem>
  );
}

export function DealKanbanCard({ deal, onStageChange, onDelete, onOpen }: DealKanbanCardProps) {
  const router = useRouter();
  const handleDelete = useCallback(() => onDelete(deal.id), [deal.id, onDelete]);
  const handleNavigate = useCallback(() => {
    if (onOpen) {
      onOpen(deal.id);
    } else {
      router.push(`/crm/deals/${deal.id}`);
    }
  }, [deal.id, onOpen, router]);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={handleNavigate}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-1">
            <h4 className="text-sm font-medium line-clamp-1">{deal.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[10px] text-muted-foreground/70 select-all">{formatDealId(deal.id)}</span>
              <DealHealthBadge expectedCloseDate={deal.expectedCloseDate} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-0.5" aria-label="More options">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DEAL_STAGES.filter(s => s.key !== deal.stage).map(s => (
                <StageMenuItem
                  key={s.key}
                  stageKey={s.key}
                  dot={s.dot}
                  label={s.label}
                  dealId={deal.id}
                  onStageChange={onStageChange}
                />
              ))}
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-lg font-bold text-gold mt-1">
          {formatINRCompact(deal.value || 0)}
        </p>

        {deal.contactPerson && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <User className="h-3 w-3" />
            {deal.contactPerson}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {deal.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={resolveImageUrl(deal.assignedTo.image)} />
                <AvatarFallback className="text-[8px]">
                  {deal.assignedTo.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{deal.assignedTo.name}</span>
            </div>
          ) : <span />}

          {deal.expectedCloseDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(deal.expectedCloseDate).toLocaleDateString(DEFAULT_LOCALE, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {deal.probability !== null && deal.probability !== undefined && deal.probability > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gold" style={{ width: `${deal.probability}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{deal.probability}% probability</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-border/30 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <AIPredictDealButton dealId={deal.id} compact />
        </div>
      </CardContent>
    </Card>
  );
}
