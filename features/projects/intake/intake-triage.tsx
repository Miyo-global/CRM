"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Check, Copy, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { EmptyState } from "@/components/ui/empty-state";
import { intakeDescriptionText } from "@/lib/projects/intake-text";
import type { IntakeRequest } from "@/types/projects";
import type { Decision } from "./intake-decision-sheet";

type Props = { pending: IntakeRequest[]; onDecide: (item: IntakeRequest, decision: Decision) => void; busy: boolean };

export function IntakeTriage({ pending, onDecide, busy }: Props) {
  const item = pending[0];

  useEffect(() => {
    if (!item || busy) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable], [role=dialog]")) return;
      const map: Record<string, Decision> = { a: "accept", d: "decline", u: "duplicate" };
      const decision = map[e.key.toLowerCase()];
      if (decision) {
        e.preventDefault();
        onDecide(item, decision);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, busy, onDecide]);

  if (!item) {
    return <EmptyState icon={Inbox} title="Inbox zero" description="Every request has a decision. New ones show up here." />;
  }

  const details = intakeDescriptionText(item.description);
  return (
    <section aria-label="Triage" className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pending.length} {pending.length === 1 ? "request" : "requests"} left
      </p>
      <article className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">{item.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : ""}
          {item.submitterEmail ? ` · from ${item.submitterEmail}` : ""}
          {item.source === "web_form" ? " · public form" : ""}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{details ?? "No details given."}</p>
      </article>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onDecide(item, "accept")} disabled={busy}>
          <Check className="size-4" aria-hidden="true" /> Accept <Kbd className="ml-1">A</Kbd>
        </Button>
        <Button variant="outline" onClick={() => onDecide(item, "decline")} disabled={busy}>
          <X className="size-4" aria-hidden="true" /> Decline <Kbd className="ml-1">D</Kbd>
        </Button>
        <Button variant="outline" onClick={() => onDecide(item, "duplicate")} disabled={busy}>
          <Copy className="size-4" aria-hidden="true" /> Duplicate <Kbd className="ml-1">U</Kbd>
        </Button>
      </div>
    </section>
  );
}
