"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { formatINR } from "@/lib/format-utils";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import type { BonusRow } from "@/lib/hr/bonus-filters";
import { useHrMyBonuses } from "@/lib/api/hooks/hr/bonuses";

function statusTone(status: string | null): Tone {
  if (status === "PAID") return "success";
  if (status === "APPROVED") return "info";
  if (status === "REJECTED") return "danger";
  return "warning";
}

function formatBonusPeriod(bonus: BonusRow): string {
  if (bonus.month) {
    try {
      return format(parseISO(`${bonus.month}-01`), "MMMM yyyy");
    } catch {
      return bonus.month;
    }
  }
  return bonus.createdAt ? format(new Date(bonus.createdAt), "MMM d, yyyy") : "—";
}

function formatPaidDate(bonus: BonusRow): string {
  if (bonus.status !== "PAID" || !bonus.approvedAt) return "—";
  return format(new Date(bonus.approvedAt), "MMM d, yyyy");
}

export function MyBonusesView() {
  const { data: bonuses, isLoading, isError, error, refetch } = useHrMyBonuses();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <QueryErrorState title="Couldn't load your bonuses" error={error} onRetry={() => refetch()} />;
  }

  if (!bonuses?.length) {
    return (
      <EmptyState
        title="No bonuses yet"
        description="When HR records a bonus for you, it will appear here with its status and payment details."
      />
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonuses.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "Bonus"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatINR(bonus.amount)}</TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone(bonus.status)} dot>
                        {bonus.status ?? "PENDING"}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatBonusPeriod(bonus)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatPaidDate(bonus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
