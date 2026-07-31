"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/format-utils";

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0) return null;

  const maxVal = data[0].value;

  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const widthPct = Math.max((stage.value / maxVal) * 100, 20);
        const convRate = i > 0 ? ((stage.value / data[i - 1].value) * 100).toFixed(1) : null;

        return (
          <div key={stage.stage} className="flex items-center gap-3">
            <div className="w-24 text-right">
              <span className="text-xs font-medium text-muted-foreground">{stage.stage}</span>
            </div>
            <div className="flex-1 relative">
              <motion.div
                className="h-9 rounded-md flex items-center px-3"
                style={{ backgroundColor: stage.color, width: `${widthPct}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              >
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  {formatNumber(stage.value)}
                </span>
              </motion.div>
            </div>
            <div className="w-14 text-right">
              {convRate && (
                <span className="text-[10px] text-muted-foreground">{convRate}%</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
