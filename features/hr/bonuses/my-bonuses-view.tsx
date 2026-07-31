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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { formatINR } from "@/lib/format-utils";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import type { BonusRow } from "@/lib/hr/bonus-filters";
import { useHrMyBonuses } from "@/lib/api/hooks/hr/bonuses";

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" {
  if (status === "PAID") return "default";
  if (status === "APPROVED") return "secondary";
  return "outline";
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
  const { data: bonuses, isLoading } = useHrMyBonuses();

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

  if (!bonuses?.length) {
    return (
      <EmptyState
        illustration={<EmptyExpensesIllustration className="h-32 w-32" />}
        title="No bonuses yet"
        description="When HR records a bonus for you, it will appear here with its status and payment details."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonuses.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "Bonus"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{formatINR(bonus.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(bonus.status)} className="text-[10px]">
                        {bonus.status ?? "PENDING"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatBonusPeriod(bonus)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPaidDate(bonus)}</TableCell>
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
