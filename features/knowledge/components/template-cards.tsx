"use client";

import { LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { KbStarterTemplate, KbTemplate } from "@/lib/api/hooks/knowledge";

/** KB-0085: a template as a card, for both the starters and the org's own. */
export function TemplateCard({
  name,
  description,
  category,
  useCount,
  onPreview,
  onUse,
  onEdit,
  onDelete,
}: {
  name: string;
  description?: string | null;
  category?: string | null;
  useCount?: number;
  onPreview?: () => void;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{name}</p>
            {description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          {category ? <span>{category}</span> : null}
          {typeof useCount === "number" ? (
            <span className="ml-auto">Used {useCount}×</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onUse}>
            Use template
          </Button>
          {onPreview ? (
            <Button size="sm" variant="secondary" onClick={onPreview}>
              Preview
            </Button>
          ) : null}
          {onEdit ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button size="sm" variant="ghost" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export type { KbStarterTemplate, KbTemplate };
