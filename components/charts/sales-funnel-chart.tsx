"use client";

import { motion } from "framer-motion";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import type { SalesFunnelStageResult } from "@/lib/api/hooks/crm";

interface SalesFunnelChartProps {
  data: SalesFunnelStageResult[];
}

export function SalesFunnelChart({ data }: SalesFunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No funnel data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 18);

        return (
          <div key={stage.stage} className="flex items-center gap-3">
            <div className="w-24 text-right shrink-0">
              <span className="text-xs font-medium text-muted-foreground leading-tight">
                {stage.stage}
              </span>
            </div>
            <div className="flex-1 relative">
              <motion.div
                className="h-9 rounded-md flex items-center justify-between px-3"
                style={{ backgroundColor: stage.color, width: `${widthPct}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
              >
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  {formatNumber(stage.count)}
                </span>
              </motion.div>
            </div>
            <div className="w-28 text-right shrink-0">
              <p className="text-xs font-medium text-foreground">
                {formatCurrency(stage.value)}
              </p>
              {stage.dropOffPct !== null && (
                <p className="text-[10px] text-muted-foreground">
                  {stage.dropOffPct}% conv.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
