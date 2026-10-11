"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Linkedin,
  Globe,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Info,
  type LucideIcon,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useSourcePortals,
  useUpsertSourcePortal,
  type SourcePortal,
  type UpsertPortalInput,
} from "@/lib/api/hooks/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import Link from "next/link";


interface PlatformConfig {
  id: UpsertPortalInput["platform"];
  label: string;
  description: string;
  icon: LucideIcon;
  docsUrl?: string;
  webhookEnvVar: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "LINKEDIN",
    label: "LinkedIn Talent Solutions",
    description: "Receive applications from LinkedIn job postings via webhook.",
    icon: Linkedin,
    webhookEnvVar: "LINKEDIN_WEBHOOK_SECRET",
  },
  {
    id: "NAUKRI",
    label: "Naukri.com",
    description: "Sync applications from Naukri job postings.",
    icon: Globe,
    webhookEnvVar: "NAUKRI_WEBHOOK_SECRET",
  },
  {
    id: "INDEED",
    label: "Indeed",
    description: "Receive inbound applications from Indeed Apply.",
    icon: Search,
    webhookEnvVar: "INDEED_WEBHOOK_SECRET",
  },
];


function PortalCard({
  config,
  portal,
}: {
  config: PlatformConfig;
  portal: SourcePortal | undefined;
}) {
  const upsert = useUpsertSourcePortal();
  const [toggling, setToggling] = useState(false);

  const Icon = config.icon;
  const connected = portal?.isActive ?? false;

  const handleToggle = useCallback(
    async (active: boolean) => {
      setToggling(true);
      try {
        await upsert.mutateAsync({ platform: config.id, isActive: active });
        toast.success(active ? `${config.label} enabled` : `${config.label} disabled`);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setToggling(false);
      }
    },
    [config.id, config.label, upsert]
  );

  return (
    <Card className={cn("overflow-hidden", connected && "border-primary")}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <IconChip icon={Icon} tone={connected ? "brand" : "neutral"} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{config.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <StatusPill tone={connected ? "success" : "neutral"}>
          {connected ? (
            <>
              <CheckCircle2 className="size-3" aria-hidden />
              Connected
            </>
          ) : (
            <>
              <XCircle className="size-3" aria-hidden />
              Inactive
            </>
          )}
        </StatusPill>
      </div>

      <div className="space-y-3 px-5 py-4">
        {portal?.lastSyncedAt && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <RefreshCw className="size-3" aria-hidden />
            Last sync: {format(new Date(portal.lastSyncedAt), "PPp")}
            {portal.lastSyncCount != null && (
              <span>({portal.lastSyncCount} candidates)</span>
            )}
          </div>
        )}

        <div className="space-y-1 rounded-md border border-border bg-surface-sunken p-3 text-xs">
          <p className="font-medium text-foreground">Webhook URL</p>
          <p className="font-mono text-muted-foreground break-all select-all">
            {`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${config.id.toLowerCase()}/applications?orgId=YOUR_ORG_ID`}
          </p>
          <p className="text-muted-foreground mt-1">
            Set <code className="rounded-xs bg-muted px-1 font-mono">{config.webhookEnvVar}</code> env var to enable signature verification.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-sunken/50 px-5 py-3">
        <Label htmlFor={`toggle-${config.id}`} className="text-sm cursor-pointer">
          {connected ? "Disable integration" : "Enable integration"}
        </Label>
        <Switch
          id={`toggle-${config.id}`}
          checked={connected}
          onCheckedChange={handleToggle}
          disabled={toggling || upsert.isPending}
        />
      </div>
    </Card>
  );
}


export default function RecruitmentIntegrationsPage() {
  const { data: portals, isLoading } = useSourcePortals();

  const portalByPlatform = (platform: string) =>
    portals?.find((p) => p.platform === platform);

  return (
    <PageWrapper
      title="Recruitment Integrations"
      subtitle="Connect job boards to automatically ingest applications into the ATS."
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft aria-hidden />
            Back to Settings
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-info-soft p-4 text-sm text-info-strong">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
          <strong>How it works:</strong> Each platform sends a webhook to the URL shown below
          whenever a candidate applies. The CRM automatically creates a candidate record and
          deduplicates by email/phone.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {PLATFORMS.map((p) => (
              <Skeleton key={p.id} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {PLATFORMS.map((config) => (
              <PortalCard
                key={config.id}
                config={config}
                portal={portalByPlatform(config.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
