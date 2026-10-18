"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useKbPages } from "@/lib/api/hooks/knowledge";

/**
 * KB-0084: the three numbers a space manager opens the space for.
 *
 * The counts come from the collection's facets, which count the whole filtered
 * set rather than the rows on this page. Drafts and pages in review are what a
 * manager can act on; everything else belongs on the analytics page.
 */
export function SpaceManagerHealthSummary({ spaceId }: { spaceId: number }) {
  const { data } = useKbPages({ scope: "space", spaceId, limit: 1 });
  const status = data?.facets?.status ?? {};

  const stats = [
    { label: "Published", value: status.published ?? 0 },
    { label: "Drafts", value: status.draft ?? 0 },
    { label: "In review", value: status.in_review ?? 0 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
