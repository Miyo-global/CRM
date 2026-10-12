"use client";

import { Laptop, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/hr";

type EmployeeAssignedAssetsPanelProps = {
  assets: Asset[];
  selectedAssetId?: number | null;
  onSelect?: (asset: Asset) => void;
  emptyMessage?: string;
  className?: string;
};

export function EmployeeAssignedAssetsPanel({
  assets,
  selectedAssetId = null,
  onSelect,
  emptyMessage = "No assets are currently assigned to this employee.",
  className,
}: EmployeeAssignedAssetsPanelProps) {
  if (assets.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed bg-surface-sunken/40 px-3 py-4 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Assigned assets</p>
        <Badge variant="secondary" className="text-2xs tabular-nums">
          {assets.length}
        </Badge>
      </div>
      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border bg-surface-sunken/40 p-2">
        {assets.map((asset) => {
          const selected = selectedAssetId === asset.id;
          const Icon = asset.type?.toLowerCase().includes("laptop") ? Laptop : Package;
          const clickable = Boolean(onSelect);

          return (
            <button
              key={asset.id}
              type="button"
              disabled={!clickable}
              onClick={() => onSelect?.(asset)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors focus-visible:focus-ring outline-none",
                clickable && "hover:bg-accent/60 cursor-pointer",
                !clickable && "cursor-default",
                selected
                  ? "border-primary bg-brand-soft ring-1 ring-ring"
                  : "border-border bg-card",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{asset.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
                  {asset.type ? <span>{asset.type}</span> : null}
                  {asset.serialNumber ? (
                    <span className="font-mono">S/N {asset.serialNumber}</span>
                  ) : null}
                  {asset.brand || asset.model ? (
                    <span>
                      {[asset.brand, asset.model].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                </div>
              </div>
              {selected ? (
                <Badge className="shrink-0 text-2xs">Selected</Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
