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
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { STATUS_CONFIG } from "@/features/crm/leads/leads-constants";
import type { Tone } from "@/lib/design/tones";
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


function scoreTone(score: number): Tone {
  return score >= 80 ? "danger" : "warning";
}

function formatDate(val: string | null): string {
  if (!val) return "";
  return formatDisplayDate(val, { day: "numeric", month: "short", year: "numeric" }) || "";
}

function StatusCell({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  return cfg ? <StatusPill tone={cfg.tone} dot>{cfg.label}</StatusPill> : <Badge variant="secondary">{status}</Badge>;
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
          <span className="text-sm font-semibold tabular-nums">Group #{index + 1}</span>

          <StatusPill tone={scoreTone(group.score)} className="tabular-nums">
            Score: {group.score}
          </StatusPill>

          {group.matchReason.map((reason) => (
            <Badge key={reason} variant="secondary">
              {reason}
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((p) => !p)}
            className="ml-auto"
            aria-label={expanded ? "Collapse group" : "Expand group"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
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
<StatusCell status={leadA.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatDate(leadA.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <StatusPill tone="success">Keep</StatusPill>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">{leadB.name}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.email ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.phone ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{leadB.company ?? ""}</TableCell>
                    <TableCell>
<StatusCell status={leadB.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatDate(leadB.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="destructive"
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
      <Skeleton className="h-20" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}


export default function DuplicateLeadsPage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useDuplicateLeads();
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
      onClick={() => refetch()}
      disabled={isFetching}
      aria-label="Refresh duplicate scan"
    >
      <RefreshCw className={cn(isFetching && "animate-spin motion-reduce:animate-none")} />
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
      ) : isError ? (
        <QueryErrorState title="Couldn't scan for duplicates" error={error} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <StatsStrip
            items={[
              { label: "Duplicate Groups Found", value: data?.total ?? 0, icon: AlertTriangle, tone: (data?.total ?? 0) > 0 ? "danger" : undefined },
              { label: "Leads at Risk", value: totalLeadsAtRisk, icon: Users },
            ]}
          />

          {!data?.groups.length ? (
            <EmptyState
              illustration={<EmptySearchIllustration />}
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
