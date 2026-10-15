"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { CalendarClock, CheckCircle2, Save, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { PropertyList } from "@/components/shared/property-list";
import { SettingsSection, SettingRow } from "@/features/settings/settings-row";
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
        title="Payroll schedule"
      >
        <div className="space-y-4">
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
      title="Payroll schedule"
      actions={
        canEdit ? (
          <>
            {dirty && <span className="text-xs text-warning-strong">Unsaved changes</span>}
            <Button onClick={handleSave} disabled={!dirty || updateSchedule.isPending} loading={updateSchedule.isPending}>
              {!updateSchedule.isPending && <Save aria-hidden />}
              {updateSchedule.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </>
        ) : undefined
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <SettingsSection
            title={
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4 text-brand-text" aria-hidden />
                Automatic Generation
              </span>
            }
            description="When enabled, payroll for the current month is generated automatically on the chosen day. Generation is idempotent — it runs once per month and skips employees who already have a payroll record."
          >
            <SettingRow
              htmlFor="payroll-auto-enabled"
              title="Enable auto-generation"
              description="Run payroll on a fixed day every month without manual action."
              control={
                <Switch
                  id="payroll-auto-enabled"
                  checked={isEnabled}
                  onCheckedChange={(v) => {
                    setIsEnabled(v);
                    setDirty(true);
                  }}
                  disabled={!canEdit}
                  aria-label="Enable automatic payroll generation"
                />
              }
            />
            <SettingRow
              htmlFor="day-of-month"
              title="Generate on"
              description="Day of the month the run is triggered (1–28)."
              control={
                <Select
                  value={String(dayOfMonth)}
                  onValueChange={(v) => {
                    setDayOfMonth(Number(v));
                    setDirty(true);
                  }}
                  disabled={!canEdit || !isEnabled}
                >
                  <SelectTrigger id="day-of-month" className="w-40">
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
              }
            />
            <SettingRow
              htmlFor="payroll-auto-approve"
              title="Auto-approve generated payroll"
              description="Approve runs immediately instead of leaving them in DRAFT for review. Approved payroll still has to be marked as paid manually."
              control={
                <Switch
                  id="payroll-auto-approve"
                  checked={autoApprove}
                  onCheckedChange={(v) => {
                    setAutoApprove(v);
                    setDirty(true);
                  }}
                  disabled={!canEdit || !isEnabled}
                  aria-label="Auto-approve generated payroll"
                />
              }
            />
          </SettingsSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <SettingsSection
            title={
              <span className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground" aria-hidden />
                Last Run
              </span>
            }
          >
            <div className="px-5 py-4">
              <PropertyList
                className="grid-cols-[160px_1fr]"
                items={[
                  { label: "Last generated period", value: <span className="font-medium tabular-nums">{formatRunPeriod(schedule?.lastRunPeriod ?? null)}</span> },
                  { label: "Last run at", value: <span className="font-medium tabular-nums">{lastRunAt ?? "Never"}</span> },
                ]}
              />
              {isEnabled && (
                <div className="mt-4 flex items-start gap-2 rounded-md bg-success-soft px-3 py-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-strong" aria-hidden />
                  <p className="text-xs text-success-strong">
                    Active — payroll will be generated automatically on the {ordinal(dayOfMonth)} of
                    each month{autoApprove ? " and approved automatically" : ""}.
                  </p>
                </div>
              )}
            </div>
          </SettingsSection>
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
