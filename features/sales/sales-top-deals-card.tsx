"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { getColorSafe, stageColors } from "@/lib/theme-constants";

interface TopDeal {
  company: string;
  stage: string;
  rep: string;
  value: number;
  probability: number;
}

interface SalesTopDealsCardProps {
  topDeals: TopDeal[];
  getPersonSlug: (name: string) => string | null;
}

export function SalesTopDealsCard({ topDeals, getPersonSlug }: SalesTopDealsCardProps) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full shadow-noir">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-gold" />
            Top Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No deals in this period.</p>
          ) : (
            <div className="space-y-3">
              {topDeals.map((deal, i) => {
                const slug = getPersonSlug(deal.rep);
                return (
                  <div
                    key={`${deal.company}-${deal.stage}-${deal.rep}-${i}`}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{deal.company}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", getColorSafe(stageColors, deal.stage))}>
                          {deal.stage}
                        </span>
                        {slug ? (
                          <Link href={`/sales/person/${slug}`} className="text-xs text-gold hover:underline">
                            {deal.rep}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">{deal.rep}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(deal.value)}</p>
                      <p className="text-[10px] text-muted-foreground">{deal.probability}% prob</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
