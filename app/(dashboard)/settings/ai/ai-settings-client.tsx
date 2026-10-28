"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsStrip } from "@/components/shared/stats-strip";
import { SettingsSection, SettingRow } from "@/features/settings/settings-row";
import {
  useOrgFeatureFlags,
  useUpdateFeatureFlag,
  useAiUsage,
  type OrgFeatureFlags,
} from "@/lib/api/hooks/ai";
import { Bot, BarChart3, BrainCircuit, type LucideIcon } from "lucide-react";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const FLAG_META: {
  key: keyof OrgFeatureFlags;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "aiChat",
    label: "AI Chat Assistant",
    description: "Context-aware chat that can answer questions about your team, projects, and tasks.",
    icon: Bot,
  },
  {
    key: "aiSmartNotifications",
    label: "Smart Notifications",
    description: "AI-enriched notification text with context and suggested next steps.",
    icon: BrainCircuit,
  },
  {
    key: "aiWeeklyRecap",
    label: "AI Weekly Recap",
    description: "Generate a narrative weekly leadership recap from HR, project and time metrics.",
    icon: BarChart3,
  },
];

// Model usage is billed by the provider in USD, so this one figure stays USD
// — but it says so in words rather than with a dollar sign in a rupee app.
function formatCost(usd: string): string {
  const val = parseFloat(usd);
  if (val === 0) return "USD 0.00";
  if (val < 0.01) return `USD ${val.toFixed(4)}`;
  return `USD ${val.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AiSettingsClient({ aiAvailable }: { aiAvailable: boolean }) {
  const { data: flags, isLoading: flagsLoading, isError: flagsError, error: flagsErr, refetch: refetchFlags } = useOrgFeatureFlags();
  const { data: usage, isLoading: usageLoading } = useAiUsage();
  const updateFlag = useUpdateFeatureFlag();

  // Each switch saves at once, org-wide; confirm it and offer a one-click undo
  // so a stray click doesn't silently change AI for everyone.
  const handleToggle = (flag: keyof OrgFeatureFlags, enabled: boolean) => {
    const label = FLAG_META.find((m) => m.key === flag)?.label ?? "AI feature";
    updateFlag.mutate(
      { flag, enabled },
      {
        onSuccess: () =>
          toast.success(`${label} turned ${enabled ? "on" : "off"}`, {
            action: { label: "Undo", onClick: () => updateFlag.mutate({ flag, enabled: !enabled }) },
          }),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
    <PageWrapper
      title="AI settings"
    >
      <div className="space-y-6">
        <SettingsSection
          title={
            <span className="flex items-center gap-2">
              <Bot className="size-4 text-brand-text" aria-hidden />
              AI Feature Flags
            </span>
          }
          description="Enable or disable AI features for your organization. Changes take effect immediately."
        >
          {!aiAvailable ? (
            <p role="status" className="mx-5 mt-4 rounded-md border border-warning-500/30 bg-warning-soft px-3 py-2.5 text-xs text-warning-strong">
              AI is not available in this workspace (no AI provider is configured), so these switches have no
              effect. They unlock once AI is enabled for the workspace.
            </p>
          ) : null}
          {flagsLoading ? (
            Array.from({ length: FLAG_META.length }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))
          ) : flagsError ? (
            <div className="p-5">
              <QueryErrorState error={flagsErr} onRetry={() => void refetchFlags()} className="min-h-0 py-8" />
            </div>
          ) : (
            FLAG_META.map(({ key, label, description, icon }) => (
              <SettingRow
                key={key}
                htmlFor={`ai-flag-${key}`}
                title={label}
                description={description}
                control={
                  <Switch
                    id={`ai-flag-${key}`}
                    checked={aiAvailable && (flags?.[key] ?? true)}
                    onCheckedChange={(enabled) => handleToggle(key, enabled)}
                    disabled={!aiAvailable || updateFlag.isPending}
                  />
                }
              />
            ))
          )}
        </SettingsSection>

        <SettingsSection
          title={
            <span className="flex items-center gap-2">
              <BarChart3 className="size-4 text-brand-text" aria-hidden />
              AI Usage (All Time)
            </span>
          }
          description="Token consumption and estimated cost broken down by feature."
        >
          <div className="space-y-5 p-5">
            {usageLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                <StatsStrip
                  className="shadow-none"
                  items={[
                    { label: "Total Requests", value: String(usage?.totals.requestCount ?? 0) },
                    { label: "Total Tokens", value: formatTokens(usage?.totals.totalTokens ?? 0) },
                    { label: "Prompt Tokens", value: formatTokens(usage?.totals.promptTokens ?? 0) },
                    { label: "Est. Cost", value: formatCost(usage?.totals.estimatedCostUsd ?? "0") },
                  ]}
                />

                {(usage?.byFeature.length ?? 0) > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">By Feature</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usage?.byFeature.map((row) => (
                          <TableRow key={`${row.feature}-${row.model}`}>
                            <TableCell className="font-medium capitalize">{row.feature.replace(/_/g, " ")}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">{row.model}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.requestCount} req</TableCell>
                            <TableCell className="text-right tabular-nums">{formatTokens(row.totalTokens)} tokens</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{formatCost(row.estimatedCostUsd)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState compact icon={BarChart3} title="No AI usage recorded yet." />
                )}
              </>
            )}
          </div>
        </SettingsSection>
      </div>
    </PageWrapper>
    </DashboardGate>
  );
}
