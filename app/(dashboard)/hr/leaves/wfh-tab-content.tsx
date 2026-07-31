"use client";

import React, { useState, useMemo } from "react";
import { isBefore, isAfter } from "date-fns";
import { useHrWfhRequests } from "@/lib/api/hooks/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyWfhIllustration } from "@/components/illustrations";
import { Loader2, Filter, TrendingUp, AlertCircle } from "lucide-react";

import type { WfhRequest } from "./leaves-shared";
import { WfhRequestItem, StatsCard } from "./leaves-shared";

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
      <div className="grid grid-cols-2 gap-3" role="list" aria-label="WFH statistics">
        <StatsCard
          title="Monthly WFH"
          value={wfhStats.thisMonth}
          subtitle="This month (approved)"
          icon={TrendingUp}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatsCard
          title="Pending"
          value={wfhStats.pending}
          subtitle="Awaiting approval"
          icon={AlertCircle}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My WFH Requests</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWfhRequests.length === 0 ? (
            <EmptyState
              illustration={<EmptyWfhIllustration />}
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
