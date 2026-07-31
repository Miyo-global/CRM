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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  FileCheck,
  Clock,
  XCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

function ackBadge(
  status: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACKNOWLEDGED") return "default";
  if (status === "DECLINED") return "destructive";
  return "outline";
}

export default function CompliancePage() {
  const { data: session } = useSession();
  const { data: acks, isLoading } = usePolicyAcknowledgments();
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
        subtitle="Policy acknowledgments and document tracking"
      >
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
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
      subtitle="Policy acknowledgments and document tracking"
      badge={pending.length > 0 ? `${pending.length} pending` : undefined}
    >
      <div className="space-y-4">
        {pending.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Acknowledgments
            </h3>
            {pending.map((ack: PolicyAcknowledgment) => (
              <Card key={ack.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {ack.document?.name ?? "Document"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Type: {ack.document?.type} &middot; Sent{" "}
                      {ack.createdAt
                        ? formatDistanceToNow(new Date(ack.createdAt), {
                            addSuffix: true,
                          })
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAcknowledge(ack.id, "ACKNOWLEDGED")}
                      disabled={acknowledgePolicy.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleAcknowledge(ack.id, "DECLINED")}
                      disabled={acknowledgePolicy.isPending}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            All Acknowledgments
          </h3>
          {all.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <EmptyDocumentsIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">
                  No policy acknowledgments yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            all.map((ack: PolicyAcknowledgment) => (
              <Card key={ack.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {ack.document?.name ?? "Document"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ack.user?.name ?? ack.user?.email}
                    </p>
                  </div>
                  <Badge variant={ackBadge(ack.status)} className="text-[10px]">
                    {ack.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
