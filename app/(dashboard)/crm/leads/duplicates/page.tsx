"use client";

import { useState, useCallback } from "react";
import {
  RefreshCw,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDuplicateLeads, useMergeLead, type DuplicateGroup } from "@/lib/api/hooks/crm";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-utils";


function scoreColor(score: number): string {
  if (score >= 80) return "bg-red-500/10 text-red-500 border-red-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
}

function formatDate(val: string | null): string {
  if (!val) return "";
  return formatDisplayDate(val, { day: "numeric", month: "short", year: "numeric" }) || "";
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    NEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    CONTACTED: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    INTERESTED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    QUALIFIED: "bg-green-500/10 text-green-500 border-green-500/20",
    CONVERTED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    LOST: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}


interface MergeTarget {
  keepLeadId: number;
  mergeLeadId: number;
  mergeName: string;
}

function DuplicateGroupCard({
  group,
  index,
  onMerge,
}: {
  group: DuplicateGroup;
  index: number;
  onMerge: (target: MergeTarget) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const leadA = group.leads[0]!;
  const leadB = group.leads[1]!;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Group #{index + 1}</span>

          <Badge variant="outline" className={cn("font-semibold text-xs", scoreColor(group.score))}>
            Score: {group.score}
          </Badge>

          {group.matchReason.map((reason) => (
            <Badge key={reason} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}

          <button
            onClick={() => setExpanded((p) => !p)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{leadA.name}</TableCell>
                    <TableCell className="text-muted-foreground">{leadA.email ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadA.phone ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadA.company ?? ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", statusBadgeClass(leadA.status))}>
                        {leadA.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(leadA.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        Keep
                      </Badge>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">{leadB.name}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.email ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.phone ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.company ?? ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", statusBadgeClass(leadB.status))}>
                        {leadB.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(leadB.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() =>
                          onMerge({
                            keepLeadId: leadA.id,
                            mergeLeadId: leadB.id,
                            mergeName: leadB.name,
                          })
                        }
                      >
                        Remove Duplicate
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}


function DuplicatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}


export default function DuplicateLeadsPage() {
  const { data, isLoading, isFetching, refetch } = useDuplicateLeads();
  const { mutate: mergeLead, isPending: isMerging } = useMergeLead();

  const [pendingMerge, setPendingMerge] = useState<MergeTarget | null>(null);

  const handleMerge = useCallback((target: MergeTarget) => {
    setPendingMerge(target);
  }, []);

  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;
    mergeLead(
      { keepLeadId: pendingMerge.keepLeadId, mergeLeadId: pendingMerge.mergeLeadId },
      { onSettled: () => setPendingMerge(null) }
    );
  }, [mergeLead, pendingMerge]);

  const totalLeadsAtRisk = (data?.groups ?? []).reduce((acc, g) => {
    const ids = new Set(g.leads.map((l) => l.id));
    ids.forEach((id) => acc.add(id));
    return acc;
  }, new Set<number>()).size;

  const refreshButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => refetch()}
      disabled={isFetching}
      aria-label="Refresh duplicate scan"
    >
      <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
      {isFetching ? "Scanning…" : "Refresh Scan"}
    </Button>
  );

  return (
    <PageWrapper
      title="Duplicate Lead Detection"
      subtitle="Fuzzy matching to find potential duplicate leads across name, email, phone, and company"
      actions={refreshButton}
    >
      {isLoading ? (
        <DuplicatesSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-2">
            <StatCard
              label="Duplicate Groups Found"
              value={data?.total ?? 0}
              color="red"
              icon={AlertTriangle}
            />
            <StatCard
              label="Leads at Risk"
              value={totalLeadsAtRisk}
              color="gold"
              icon={Users}
            />
          </div>

          {!data?.groups.length ? (
            <EmptyState
              illustration={<EmptySearchIllustration className="h-40 w-40" />}
              title="No Duplicates Found"
              description="Great news — no potential duplicate leads were detected across your pipeline."
            />
          ) : (
            <div className="space-y-4">
              {data.groups.map((group, index) => (
                <DuplicateGroupCard
                  key={`${group.leads[0]?.id}-${group.leads[1]?.id}`}
                  group={group}
                  index={index}
                  onMerge={handleMerge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingMerge}
        onOpenChange={(open) => !open && setPendingMerge(null)}
        title="Remove Duplicate Lead"
        description={`This will merge "${pendingMerge?.mergeName}" into the primary lead and soft-delete it. All activities and notes will be preserved. This action cannot be undone.`}
        confirmLabel={isMerging ? "Merging…" : "Merge & Remove"}
        destructive
        onConfirm={confirmMerge}
      />
    </PageWrapper>
  );
}
