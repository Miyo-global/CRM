"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  usePolicyAcknowledgments,
  useAcknowledgePolicy,
  type PolicyAcknowledgment,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FileCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { ackStatusLabel } from "@/lib/labels";

function ackTone(status: string | null): Tone {
  if (status === "ACKNOWLEDGED") return "success";
  if (status === "DECLINED") return "danger";
  return "warning";
}

export default function CompliancePage() {
  const { data: session } = useSession();
  const { data: acks, isLoading, isError, error, refetch } = usePolicyAcknowledgments();
  const acknowledgePolicy = useAcknowledgePolicy();

  const handleAcknowledge = useCallback(
    (id: number, status: "ACKNOWLEDGED" | "DECLINED") => {
      acknowledgePolicy.mutate(
        { acknowledgmentId: id, status },
        {
          onSuccess: () =>
            toast.success(
              status === "ACKNOWLEDGED"
                ? "Policy acknowledged"
                : "Policy declined",
            ),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [acknowledgePolicy],
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Compliance"
      >
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const pending =
    acks?.filter(
      (a) => a.status === "PENDING" && a.userId === session?.user?.id,
    ) ?? [];
  const all = acks ?? [];

  return (
    <PageWrapper
      title="Compliance"
      badge={pending.length > 0 ? `${pending.length} pending` : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <div className="space-y-6">
        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-warning-strong" aria-hidden="true" />
              Pending Acknowledgments
            </h2>
            {pending.map((ack: PolicyAcknowledgment) => (
              <Card key={ack.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {ack.document?.name ?? "Document"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {ack.document?.type} &middot; Sent{" "}
                        {ack.createdAt
                          ? formatDistanceToNow(new Date(ack.createdAt), {
                              addSuffix: true,
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcknowledge(ack.id, "ACKNOWLEDGED")}
                      disabled={acknowledgePolicy.isPending}
                      loading={acknowledgePolicy.isPending && acknowledgePolicy.variables?.acknowledgmentId === ack.id && acknowledgePolicy.variables?.status === "ACKNOWLEDGED"}
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(ack.id, "DECLINED")}
                      disabled={acknowledgePolicy.isPending}
                      loading={acknowledgePolicy.isPending && acknowledgePolicy.variables?.acknowledgmentId === ack.id && acknowledgePolicy.variables?.status === "DECLINED"}
                    >
                      <XCircle className="size-4" aria-hidden="true" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            All Acknowledgments
          </h2>
          {all.length === 0 ? (
            <EmptyState
              title="No policy acknowledgments yet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((ack: PolicyAcknowledgment) => (
                  <TableRow key={ack.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate font-medium text-foreground">
                          {ack.document?.name ?? "Document"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ack.user?.name ?? ack.user?.email}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={ackTone(ack.status)} dot>
                        {ackStatusLabel(ack.status)}
                      </StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
      )}
    </PageWrapper>
  );
}
