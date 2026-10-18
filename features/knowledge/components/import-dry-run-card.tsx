"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { KbImportPlan } from "@/lib/api/hooks/knowledge";
import { pluralise } from "@/lib/format-utils";

/**
 * KB-0088: what the import would do.
 *
 * Shown before the import runs, because "replace its content" on the wrong
 * space is not something anyone should discover afterwards.
 */
export function ImportDryRunCard({ plan }: { plan: KbImportPlan }) {
  const invalid = plan.items.filter((item) => item.outcome === "invalid");

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 text-sm">
        <p className="font-medium text-foreground">
          {pluralise(plan.total, "file")} read: {plan.new} new, {plan.duplicate} already there,{" "}
          {plan.invalid} unusable.
        </p>

        {invalid.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {invalid.slice(0, 10).map((item, index) => (
              <li key={`${item.title}-${index}`}>
                {item.title || "Untitled"} — {item.reason ?? "unusable"}
              </li>
            ))}
            {invalid.length > 10 ? <li>and {invalid.length - 10} more</li> : null}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
