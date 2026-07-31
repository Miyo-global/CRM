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
  ChevronRight,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  icon: React.ElementType;
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
    <Card className={connected ? "border-primary/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">{config.label}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              connected
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                : "bg-muted text-muted-foreground border-border text-[11px]"
            }
          >
            {connected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {portal && (
          <div className="text-xs text-muted-foreground space-y-1">
            {portal.lastSyncedAt && (
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Last sync: {format(new Date(portal.lastSyncedAt), "PPp")}
                {portal.lastSyncCount != null && (
                  <span>({portal.lastSyncCount} candidates)</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-medium text-foreground">Webhook URL</p>
          <p className="font-mono text-muted-foreground break-all">
            {`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${config.id.toLowerCase()}/applications?orgId=YOUR_ORG_ID`}
          </p>
          <p className="text-muted-foreground mt-1">
            Set <code className="bg-muted px-1 rounded">{config.webhookEnvVar}</code> env var to enable signature verification.
          </p>
        </div>

        <div className="flex items-center justify-between">
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
      </CardContent>
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
            <ChevronRight className="mr-1 h-3.5 w-3.5 rotate-180" />
            Back to Settings
          </Link>
        </Button>
      }
    >
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-lg border bg-blue/5 border-blue/20 p-4 text-sm text-blue">
          <strong>How it works:</strong> Each platform sends a webhook to the URL shown below
          whenever a candidate applies. The CRM automatically creates a candidate record and
          deduplicates by email/phone.
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {PLATFORMS.map((p) => (
              <Skeleton key={p.id} className="h-48 w-full rounded-xl" />
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
