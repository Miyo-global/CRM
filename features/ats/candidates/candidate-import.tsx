"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  dryRun: boolean;
  toCreate: number;
  duplicates: number;
  created: number;
  skipped: { line: number; reason: string }[];
}

/** MIYO-0649: paste or pick a CSV, see what would happen, then do it. */
export function CandidateImport() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(dryRun: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/ats/candidates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not read that file.");
        return;
      }
      setResult(body);
      if (!dryRun) {
        toast.success(`Imported ${body.created}.`);
        router.push("/ats/candidates");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-5">
      <div className="grid gap-2">
        <Label htmlFor="file">CSV file</Label>
        <input
          id="file"
          type="file"
          accept=".csv,text/csv"
          className="text-sm text-foreground"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setCsv(await file.text());
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="csv">Or paste it</Label>
        <Textarea
          id="csv"
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Name,Email,Phone"
        />
        <p className="text-xs text-muted-foreground">
          A header row is expected. Name or First name and Last name, Email, Phone, LinkedIn
          and Source are recognised; anything else is ignored.
        </p>
      </div>

      {result && (
        <div className="border-l-2 border-border pl-4 text-sm">
          <p className="text-foreground">
            {result.dryRun ? "Dry run: " : "Imported: "}
            {result.dryRun ? result.toCreate : result.created} to add, {result.duplicates}{" "}
            already on file, {result.skipped.length} skipped.
          </p>
          {result.skipped.slice(0, 5).map((row) => (
            <p key={row.line} className="mt-1 text-muted-foreground">
              Line {row.line}: {row.reason}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" disabled={busy || !csv.trim()} onClick={() => void run(true)}>
          Dry run
        </Button>
        <Button
          disabled={busy || !csv.trim() || !result?.dryRun || result.toCreate === 0}
          onClick={() => void run(false)}
        >
          Import
        </Button>
      </div>
    </div>
  );
}
