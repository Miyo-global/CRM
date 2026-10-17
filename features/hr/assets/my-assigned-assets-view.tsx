"use client";

import { Laptop, MapPin, Package } from "lucide-react";
import { format } from "date-fns";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useMyAssignedAssets } from "@/lib/api/hooks";

function assetIcon(type: string) {
  return type.toLowerCase().includes("laptop") ? Laptop : Package;
}

export function MyAssignedAssetsView() {
  const { data: assets, isLoading, isError, error, refetch } = useMyAssignedAssets();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (!assets?.length) {
    return (
      <EmptyState
        title="No assets assigned"
        description="When HR assigns company equipment to you, it will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        const Icon = assetIcon(asset.type);
        return (
          <Card key={asset.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold leading-tight" title={asset.name}>{asset.name}</h3>
                      <p className="text-sm text-muted-foreground">{asset.type}</p>
                    </div>
                    <StatusPill tone="success" dot className="shrink-0">
                      Assigned
                    </StatusPill>
                  </div>
                  <dl className="space-y-1 text-sm">
                    {asset.brand || asset.model ? (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">Device</dt>
                        <dd className="font-medium">
                          {[asset.brand, asset.model].filter(Boolean).join(" ")}
                        </dd>
                      </div>
                    ) : null}
                    {asset.serialNumber ? (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">Serial</dt>
                        <dd className="truncate font-mono text-xs">{asset.serialNumber}</dd>
                      </div>
                    ) : null}
                    {asset.location ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        <span>{asset.location}</span>
                      </div>
                    ) : null}
                    {asset.updatedAt ? (
                      <p className="pt-1 text-xs tabular-nums text-muted-foreground">
                        Assigned{" "}
                        {format(new Date(asset.updatedAt), "d MMM yyyy")}
                      </p>
                    ) : null}
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
