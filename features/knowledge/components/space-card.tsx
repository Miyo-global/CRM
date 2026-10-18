"use client";

import { Library } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { KbSpace } from "@/lib/api/hooks/knowledge";
import { spaceHref } from "@/lib/knowledge/routes";
import { toneDot } from "@/lib/design/tones";
import { cn } from "@/lib/utils";

import { spaceColorTone, spaceTypeLabel } from "../lib/space-meta";

/** KB-0084: one space as a card. */
export function SpaceCard({ space }: { space: KbSpace }) {
  return (
    <Card className="transition-colors hover:border-border-strong">
      <CardContent className="p-4">
        <Link href={spaceHref(space.id)} className="flex items-start gap-2">
          <span
            aria-hidden
            className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", toneDot[spaceColorTone(space.color)])}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">{space.name}</span>
              {space.archivedAt ? <StatusPill tone="warning">Archived</StatusPill> : null}
            </span>
            {space.description ? (
              <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                {space.description}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Library className="h-3.5 w-3.5" />
          {spaceTypeLabel(space.type)}
          {typeof space.pageCount === "number" ? (
            <span className="ml-auto">
              {space.pageCount} {space.pageCount === 1 ? "page" : "pages"}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
