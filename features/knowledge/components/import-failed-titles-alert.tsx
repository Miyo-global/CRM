"use client";

import { AlertTriangle } from "lucide-react";

/**
 * KB-0088: the pages that did not come through.
 *
 * Named, not counted: a failed import is only actionable if you know which
 * file to look at.
 */
export function ImportFailedTitlesAlert({ titles }: { titles: string[] }) {
  if (titles.length === 0) return null;

  return (
    <div className="flex gap-2 rounded-lg border border-warning-500 bg-warning-soft p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
      <div>
        <p className="font-medium text-warning-strong">
          {titles.length === 1 ? "One page didn't import" : `${titles.length} pages didn't import`}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-warning-strong">
          {titles.slice(0, 10).map((title) => (
            <li key={title}>{title}</li>
          ))}
          {titles.length > 10 ? <li>and {titles.length - 10} more</li> : null}
        </ul>
      </div>
    </div>
  );
}
