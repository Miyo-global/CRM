"use client";

import { memo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";

import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOnboardingStatus,
  useInitiateOnboarding,
  type OnboardingStatus,
} from "@/lib/api/hooks/hr/onboarding";
import { HrSheet } from "@/features/hr/hr-sheet";


function stalledBadge(row: OnboardingStatus): boolean {
  if (row.percentComplete >= 100) return false;
  if (!row.lastCompletedAt) return false;
  const last = new Date(row.lastCompletedAt).getTime();
  return Date.now() - last > 48 * 60 * 60 * 1000;
}


interface InitiateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InitiateSheet({ open, onOpenChange }: InitiateSheetProps) {
  const [userId, setUserId] = useState("");
  const initiate = useInitiateOnboarding();

  const handleSubmit = useCallback(() => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }
    initiate.mutate(userId.trim(), {
      onSuccess: (data) => {
        toast.success(`Onboarding initiated — ${data.tasksCreated} tasks created`);
        setUserId("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, initiate, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setUserId("");
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Initiate Onboarding"
      description="Create an onboarding checklist for an employee using the active template."
      onSubmit={handleSubmit}
      submitLabel="Start Onboarding"
      isPending={initiate.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee User ID <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="user_..."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Employee user ID"
        />
        <p className="text-[11px] text-muted-foreground">
          Enter the internal user ID of the employee to onboard.
        </p>
      </div>
    </HrSheet>
  );
}


interface OnboardingRowProps {
  row: OnboardingStatus;
}

const OnboardingRow = memo(function OnboardingRow({ row }: OnboardingRowProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="text-sm font-medium truncate">{row.userName}</p>
              {row.percentComplete === 100 && (
                <Badge className="text-[10px] shrink-0" variant="default">
                  Complete
                </Badge>
              )}
              {stalledBadge(row) && (
                <Badge className="text-[10px] shrink-0" variant="destructive">
                  Stalled
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={row.percentComplete} className="h-1.5 flex-1" />
              <span className="text-[11px] text-muted-foreground shrink-0">
                {row.completedTasks}/{row.totalTasks}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            asChild
          >
            <Link
              href={`/hr/onboarding/${row.userId}`}
              aria-label={`View ${row.userName} onboarding`}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});


export function HrWorkflowTab() {
  const { data, isLoading } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  const handleInitiateOpen = useCallback(() => setInitiateOpen(true), []);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full gap-3">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleInitiateOpen}
          aria-label="Initiate onboarding for an employee"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Initiate Onboarding
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No onboardings in progress"
          description="Use the button above to start onboarding for a new hire."
          compact
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <OnboardingRow key={row.userId} row={row} />
          ))}
        </div>
      )}

      <InitiateSheet open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}
