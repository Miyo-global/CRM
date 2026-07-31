"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-utils";
import { motion } from "framer-motion";
import { fadeUp, scaleIn } from "@/lib/motion-variants";

interface StageData {
  stage: string;
  count: number;
  value: number;
  color: string;
}

interface SalesDealsByStageCardProps {
  dealsByStage: StageData[];
  maxCount: number;
}

export function SalesDealsByStageCard({ dealsByStage, maxCount }: SalesDealsByStageCardProps) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Deals by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {dealsByStage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No deals yet. Create your first deal to see stage breakdown.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {dealsByStage.map((stage) => (
                <motion.div
                  key={stage.stage}
                  className="relative overflow-hidden rounded-xl border border-border p-4"
                  variants={scaleIn}
                >
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundColor: stage.color }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{stage.count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(stage.value)} value</p>
                    <div
                      className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-valuenow={stage.count}
                      aria-valuemin={0}
                      aria-valuemax={maxCount}
                      aria-label={`${stage.stage} deal count`}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: stage.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(stage.count / Math.max(maxCount, 1)) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
