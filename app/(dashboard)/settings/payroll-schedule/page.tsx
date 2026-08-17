"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { CalendarClock, CheckCircle2, Save, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  usePayrollSchedule,
  useUpdatePayrollSchedule,
} from "@/lib/api/hooks/hr/payroll-extended";
import { toast } from "sonner";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function formatRunPeriod(period: string | null): string {
  if (!period) return "Never";
  const d = new Date(`${period}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString(DEFAULT_LOCALE, { month: "long", year: "numeric" });
}

function formatRunAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(DEFAULT_LOCALE, { dateStyle: "medium", timeStyle: "short" });
}

export default function PayrollSchedulePage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = role === "CEO" || role === "ADMIN";

  const { data: schedule, isLoading } = usePayrollSchedule();
  const updateSchedule = useUpdatePayrollSchedule();

  const [isEnabled, setIsEnabled] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [autoApprove, setAutoApprove] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (schedule) {
      setIsEnabled(schedule.isEnabled);
      setDayOfMonth(schedule.dayOfMonth);
      setAutoApprove(schedule.autoApprove);
      setDirty(false);
    }
  }, [schedule]);

  const handleSave = useCallback(() => {
    updateSchedule.mutate(
      { frequency: "MONTHLY", dayOfMonth, isEnabled, autoApprove },
      {
        onSuccess: () => {
          toast.success("Payroll schedule saved");
          setDirty(false);
        },
        onError: () => toast.error("Failed to save payroll schedule"),
      },
    );
  }, [updateSchedule, dayOfMonth, isEnabled, autoApprove]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Payroll Schedule"
        subtitle="Automate monthly payroll generation for your organization"
      >
        <div className="space-y-4 max-w-2xl">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const lastRunAt = formatRunAt(schedule?.lastRunAt ?? null);

  return (
    <PageWrapper
      title="Payroll Schedule"
      subtitle="Automate monthly payroll generation for your organization"
      actions={
        canEdit ? (
          <Button onClick={handleSave} disabled={!dirty || updateSchedule.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateSchedule.isPending ? "Saving..." : "Save Changes"}
          </Button>
        ) : undefined
      }
    >
      <motion.div
        className="space-y-6 max-w-2xl"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-gold" />
                Automatic Generation
              </CardTitle>
              <CardDescription>
                When enabled, payroll for the current month is generated automatically on the
                chosen day. Generation is idempotent — it runs once per month and skips employees
                who already have a payroll record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Enable auto-generation</p>
                  <p className="text-xs text-muted-foreground">
                    Run payroll on a fixed day every month without manual action.
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(v) => {
                    setIsEnabled(v);
                    setDirty(true);
                  }}
                  disabled={!canEdit}
                  aria-label="Enable automatic payroll generation"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="day-of-month" className="text-sm font-medium">
                    Generate on
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Day of the month the run is triggered (1–28).
                  </p>
                </div>
                <Select
                  value={String(dayOfMonth)}
                  onValueChange={(v) => {
                    setDayOfMonth(Number(v));
                    setDirty(true);
                  }}
                  disabled={!canEdit || !isEnabled}
                >
                  <SelectTrigger id="day-of-month" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)} of month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Auto-approve generated payroll</p>
                  <p className="text-xs text-muted-foreground">
                    Approve runs immediately instead of leaving them in DRAFT for review. Approved
                    payroll still has to be marked as paid manually.
                  </p>
                </div>
                <Switch
                  checked={autoApprove}
                  onCheckedChange={(v) => {
                    setAutoApprove(v);
                    setDirty(true);
                  }}
                  disabled={!canEdit || !isEnabled}
                  aria-label="Auto-approve generated payroll"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-blue" />
                Last Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last generated period</span>
                <span className="font-medium">{formatRunPeriod(schedule?.lastRunPeriod ?? null)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last run at</span>
                <span className="font-medium">{lastRunAt ?? "Never"}</span>
              </div>
              {isEnabled && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Active — payroll will be generated automatically on the {ordinal(dayOfMonth)} of
                    each month{autoApprove ? " and approved automatically" : ""}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Only CEO or Admin can change the payroll schedule.
          </p>
        )}
      </motion.div>
    </PageWrapper>
  );
}
