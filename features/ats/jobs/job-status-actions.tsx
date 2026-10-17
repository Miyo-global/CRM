"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Action = "publish" | "unpublish" | "close" | "reopen";

const LABELS: Record<Action, string> = {
  publish: "Publish",
  unpublish: "Unpublish",
  close: "Close",
  reopen: "Publish again",
};

/** MIYO-0634: publish, unpublish and close, from the job page. */
export function JobStatusActions({
  jobId,
  status,
  slug,
}: {
  jobId: number;
  status: string;
  slug: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const actions: Action[] =
    status === "OPEN"
      ? ["unpublish", "close"]
      : status === "CLOSED"
        ? ["reopen"]
        : ["publish"];

  async function run(action: Action) {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/jobs/${jobId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not change the job.");
        return;
      }
      toast.success(
        action === "publish" || action === "reopen"
          ? "Published. It is on the careers site."
          : action === "close"
            ? "Closed."
            : "Unpublished.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "OPEN" && slug && (
        <Button variant="outline" asChild>
          <Link href={`/careers/${slug}`} target="_blank">
            View on careers
          </Link>
        </Button>
      )}
      {actions.map((action) => (
        <Button
          key={action}
          variant={action === "publish" || action === "reopen" ? "default" : "outline"}
          disabled={busy}
          onClick={() => void run(action)}
        >
          {LABELS[action]}
        </Button>
      ))}
    </div>
  );
}
