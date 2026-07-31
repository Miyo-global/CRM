"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  useHrPendingWfhRequests,
  useHrLeaveContext,
  useHrLeaveApprovals,
  useHrMyLeaveRequests,
  useHrLeavesThisWeek,
} from "@/lib/api/hooks/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Home, CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { hasLeaveApproverRole, countActionableLeaveRequests } from "@/lib/auth/leave-approval-roles";

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";

import type {
  LeaveBalance, LeaveType, LeaveRequest, ApprovedLeave,
} from "./leaves-shared";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";

export function LeavesWfhContent() {
  const { data: session } = useSession();
  const isAdmin = hasLeaveApproverRole(session?.user?.role);

  const { data: contextData, isLoading: contextLoading } = useHrLeaveContext();
  const { data: myData, isLoading: myLoading } = useHrMyLeaveRequests();
  const { data: approvalsData, isLoading: approvalsLoading, isError: approvalsError, error: approvalsErrorObj, refetch: refetchApprovals } =
    useHrLeaveApprovals(isAdmin);
  const { data: thisWeekData } = useHrLeavesThisWeek();
  const { data: pendingWfhRequests } = useHrPendingWfhRequests();

  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [wfhSheetOpen, setWfhSheetOpen] = useState(false);

  const handleOpenLeaveSheet = useCallback(() => setLeaveSheetOpen(true), []);
  const handleOpenWfhSheet = useCallback(() => setWfhSheetOpen(true), []);

  const balances = (contextData?.balances ?? []) as LeaveBalance[];
  const leaveTypes = (contextData?.types ?? []) as LeaveType[];
  const joiningDate = contextData?.joiningDate ?? null;

  const myLeaveRequests = ((myData?.requests ?? []) as LeaveRequest[]);
  const incomingLeaveRequests = ((approvalsData?.pending ?? []) as LeaveRequest[]);
  const allIncomingLeaveRequests = ((approvalsData?.all ?? []) as LeaveRequest[]);
  const approvedLeavesThisWeek = ((thisWeekData ?? []) as ApprovedLeave[]);

  const sessionUserId = session?.user?.id ?? null;
  const sessionRole = session?.user?.role ?? null;
  const actionableLeaveCount = countActionableLeaveRequests(
    incomingLeaveRequests,
    sessionRole,
    sessionUserId,
  );
  const actionableWfhCount = isAdmin
    ? (pendingWfhRequests ?? []).filter(
        (req) => sessionUserId && req.user?.id !== sessionUserId,
      ).length
    : 0;
  const totalPendingApprovals = actionableLeaveCount + actionableWfhCount;

  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);
  const pendingCount = myLeaveRequests.filter((r) => r.status === "PENDING").length;
  const approvedCount = myLeaveRequests.filter((r) => r.status === "APPROVED").length;

  if (contextLoading || myLoading) {
    return (
      <PageWrapper title="Leaves & Time Off" subtitle="Manage your leave requests, work from home, and approvals.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Leaves & Time Off"
        subtitle="Manage your leave requests, work from home, and approvals."
        stickyHeader
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWfhSheet}
              className="gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Request WFH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenLeaveSheet}
              className="gap-1.5 bg-gold hover:bg-gold/80 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Request Leave
            </Button>
          </>
        }
      >
        <div className="space-y-5">

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Available Days"
              value={totalAvailable}
              icon={CalendarCheck}
              color="green"
            />
            <StatCard
              label="Pending Requests"
              value={pendingCount}
              icon={Clock3}
              color="gold"
            />
            <StatCard
              label="Approved (YTD)"
              value={approvedCount}
              icon={BadgeCheck}
              color="blue"
            />
          </div>

          {approvedLeavesThisWeek.length > 0 && (
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                  Who&apos;s Out This Week
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {approvedLeavesThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border border-amber-200/50 dark:border-amber-800/20"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(leave.startDate), "MMM dd")} –{" "}
                          {format(new Date(leave.endDate), "MMM dd")}
                          {leave.leaveType && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              · {leave.leaveType.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="my-leaves" className="min-h-0">
            <TabsList className="bg-muted/50 border border-border p-1 rounded-lg h-auto gap-1">
              <TabsTrigger
                value="my-leaves"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                My Leaves
              </TabsTrigger>
              <TabsTrigger
                value="wfh"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                Work From Home
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="approvals"
                  className="relative data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                >
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-red-500 text-white text-[10px] font-bold border-0">
                      {totalPendingApprovals}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-leaves" className="mt-4">
              <LeavesTabContent
                balances={balances}
                myLeaveRequests={myLeaveRequests}
                approvedLeavesThisWeek={approvedLeavesThisWeek}
              />
            </TabsContent>

            <TabsContent value="wfh" className="mt-4">
              <WfhTabContent />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="mt-4">
                {approvalsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : approvalsError ? (
                  <Card className="border-destructive/30">
                    <CardContent className="py-8 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Could not load leave approvals: {getErrorMessage(approvalsErrorObj)}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => refetchApprovals()}>
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <LeaveApprovalsContent
                    incomingLeaveRequests={incomingLeaveRequests}
                    allIncomingLeaveRequests={allIncomingLeaveRequests}
                  />
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageWrapper>

      <LeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveTypes={leaveTypes}
        joiningDate={joiningDate}
        balances={balances}
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
        joiningDate={joiningDate}
      />
    </>
  );
}
