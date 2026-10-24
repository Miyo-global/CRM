"use client";

import React, { useState, useCallback, useMemo } from "react";
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
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Home } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { hasLeaveApproverRole, countActionableLeaveRequests } from "@/lib/auth/leave-approval-roles";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { calculateLeaveWorkingDays } from "@/lib/validations/leave-request";
import { useHolidayDates } from "@/lib/api/hooks/hr/holiday-dates";

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";

import type {
  LeaveBalance, LeaveType, LeaveRequest, ApprovedLeave,
} from "./leaves-shared";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";
import { parseCalendarDate } from "@/lib/date-utils";

export function LeavesWfhContent() {
  const { data: session } = useSession();
  const isAdmin = hasLeaveApproverRole(session?.user?.role);

  const { data: contextData, isLoading: contextLoading } = useHrLeaveContext();
  const { data: myData, isLoading: myLoading } = useHrMyLeaveRequests();
  const { data: approvalsData, isLoading: approvalsLoading, isError: approvalsError, error: approvalsErrorObj, refetch: refetchApprovals } =
    // Managers approve their reports' leave too (MIYO-0084), so everyone asks;
    // the API answers an empty list for someone with no team (R3-EMP-07).
    useHrLeaveApprovals(true);
  const { data: thisWeekData } = useHrLeavesThisWeek();
  // Admin-only endpoint; employees would get a 403 on every load (R3-EMP-07).
  const { data: pendingWfhRequests } = useHrPendingWfhRequests(isAdminOrOwner(session?.user?.role));

  // The Global Create menu links here with ?apply=leave (QA-0039).
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("apply") === "leave",
  );
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
  const showApprovals = isAdmin || allIncomingLeaveRequests.length > 0;

  // Days already awaiting approval, so the balance hint and validation count
  // them against the balance (A29).
  const holidayDates = useHolidayDates();
  const pendingDaysByType = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const request of myLeaveRequests) {
      if (request.status !== "PENDING") continue;
      const typeName = request.leaveType?.name;
      if (!typeName) continue;
      byType[typeName] =
        (byType[typeName] ?? 0) +
        calculateLeaveWorkingDays({
          startDate: String(request.startDate),
          endDate: String(request.endDate),
          isHalfDay: request.isHalfDay ?? false,
          holidays: holidayDates,
        });
    }
    return byType;
  }, [myLeaveRequests, holidayDates]);

  if (contextLoading || myLoading) {
    return (
      <PageWrapper title="Leaves">
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-64" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Leaves"
        breadcrumbs={[
          { label: "My HR", href: "/hr" },
          { label: "Leaves" },
        ]}
        stickyHeader
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWfhSheet}
              className="gap-1.5"
            >
              <Home className="size-4" aria-hidden="true" />
              Request WFH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenLeaveSheet}
              className="gap-1.5"
            >
              <Plus className="size-4" aria-hidden="true" />
              Request leave
            </Button>
          </>
        }
      >
        <div className="space-y-5">

          {approvedLeavesThisWeek.length > 0 && (
            <Card className="gap-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  Who&apos;s Out This Week
                  <Badge variant="secondary" className="ml-1 tabular-nums">
                    {approvedLeavesThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} alt="" />
                        <AvatarFallback className="text-2xs bg-warning-soft text-warning-strong">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-2xs tabular-nums text-muted-foreground">
                          {format(parseCalendarDate(leave.startDate), "MMM dd")} –{" "}
                          {format(parseCalendarDate(leave.endDate), "MMM dd")}
                          {leave.leaveType && (
                            <span className="ml-1 text-warning-strong">
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
            <TabsList variant="underline" className="overflow-x-auto">
              <TabsTrigger
                value="my-leaves"
              >
                My Leaves
              </TabsTrigger>
              <TabsTrigger
                value="wfh"
              >
                Work From Home
              </TabsTrigger>
              {showApprovals && (
                <TabsTrigger
                  value="approvals"
                  className="relative"
                >
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 justify-center px-1.5 tabular-nums">
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
                pendingDaysByType={pendingDaysByType}
              />
            </TabsContent>

            <TabsContent value="wfh" className="mt-4">
              <WfhTabContent />
            </TabsContent>

            {showApprovals && (
              <TabsContent value="approvals" className="mt-4">
                {approvalsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : approvalsError ? (
                  <QueryErrorState
                    title="Could not load leave approvals"
                    error={new Error(getErrorMessage(approvalsErrorObj))}
                    onRetry={() => refetchApprovals()}
                  />
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
        pendingDaysByType={pendingDaysByType}
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
        joiningDate={joiningDate}
      />
    </>
  );
}
