"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface StageRow {
  id: number;
  name: string;
  type: string;
  sort: number;
}

const FIXED = new Set(["APPLIED", "HIRED", "REJECTED"]);

/** MIYO-0650: add, rename and remove the stages in the middle. */
export function StageEditor({ stages }: { stages: StageRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(url: string, init: RequestInit, done: string) {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not save the stage.");
        return false;
      }
      toast.success(done);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-4">
      <ol className="grid gap-2">
        {stages.map((stage) => (
          <li key={stage.id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <span className="text-sm text-foreground">{stage.name}</span>
                {FIXED.has(stage.type) ? (
                  <span className="text-xs text-muted-foreground">fixed</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void send(
                        `/api/ats/stages/${stage.id}`,
                        { method: "DELETE" },
                        "Stage removed.",
                      )
                    }
                  >
                    Remove
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const added = await send(
            "/api/ats/stages",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim() }),
            },
            "Stage added.",
          );
          if (added) setName("");
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Assignment"
          aria-label="New stage name"
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          Add stage
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        A new stage goes in before Hired and Rejected. Jobs created from now on use this
        list; jobs already running keep the stages they started with.
      </p>
    </div>
  );
}
