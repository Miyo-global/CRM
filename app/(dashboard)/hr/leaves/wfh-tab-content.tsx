"use client";

import React, { useState, useMemo } from "react";
import { isBefore, isAfter } from "date-fns";
import { useHrWfhRequests } from "@/lib/api/hooks/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Filter, TrendingUp, AlertCircle } from "lucide-react";

import type { WfhRequest } from "./leaves-shared";
import { WfhRequestItem } from "./leaves-shared";
import { StatsStrip } from "@/components/shared/stats-strip";
import { Skeleton } from "@/components/ui/skeleton";

export function WfhTabContent() {
  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>("ALL");
  const { data: myWfhRequests, isLoading: wfhLoading } = useHrWfhRequests();

  const filteredWfhRequests = useMemo(() => {
    if (!myWfhRequests) return [];
    if (wfhStatusFilter === "ALL") return myWfhRequests;
    return myWfhRequests.filter((r) => (r.status || "PENDING") === wfhStatusFilter);
  }, [myWfhRequests, wfhStatusFilter]);

  const wfhStats = useMemo(() => {
    if (!myWfhRequests) return { thisMonth: 0, pending: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      thisMonth: myWfhRequests.filter((r) => {
        const d = new Date(r.date);
        return r.status === "APPROVED" && !isBefore(d, monthStart) && !isAfter(d, monthEnd);
      }).length,
      pending: myWfhRequests.filter((r) => !r.status || r.status === "PENDING").length,
    };
  }, [myWfhRequests]);

  return (
    <div className="space-y-4">
      <StatsStrip
        items={[
          { label: "Monthly WFH", value: wfhStats.thisMonth, hint: "This month (approved)", icon: TrendingUp, tone: "success" },
          { label: "Pending", value: wfhStats.pending, hint: "Awaiting approval", icon: AlertCircle, tone: wfhStats.pending > 0 ? "warning" : undefined },
        ]}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">My WFH Requests</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
                <SelectTrigger className="h-9 w-36" aria-label="Status filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0" aria-live="polite">
          {wfhLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredWfhRequests.length === 0 ? (
            <EmptyState
              title={wfhStatusFilter === "ALL" ? "No WFH requests yet" : `No ${wfhStatusFilter.toLowerCase()} requests`}
              description="Use the Request WFH button above to submit a new request."
              className="border-0 bg-transparent"
              compact
            />
          ) : (
            <div className="space-y-3" role="list" aria-label="My WFH requests">
              {filteredWfhRequests.map((req) => (
                <WfhRequestItem key={req.id} request={req as WfhRequest} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  );
}
