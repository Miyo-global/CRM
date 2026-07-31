"use client";

import { Laptop, MapPin, Package } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useMyAssignedAssets } from "@/lib/api/hooks";

function assetIcon(type: string) {
  return type.toLowerCase().includes("laptop") ? Laptop : Package;
}

export function MyAssignedAssetsView() {
  const { data: assets, isLoading } = useMyAssignedAssets();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
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

  if (!assets?.length) {
    return (
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
        title="No assets assigned"
        description="When HR assigns company equipment to you, it will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {assets.map((asset) => {
        const Icon = assetIcon(asset.type);
        return (
          <Card key={asset.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold leading-tight">{asset.name}</h3>
                      <p className="text-sm text-muted-foreground">{asset.type}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Assigned
                    </Badge>
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
                        <dd className="font-mono text-xs">{asset.serialNumber}</dd>
                      </div>
                    ) : null}
                    {asset.location ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{asset.location}</span>
                      </div>
                    ) : null}
                    {asset.updatedAt ? (
                      <p className="text-xs text-muted-foreground pt-1">
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
