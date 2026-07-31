"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
