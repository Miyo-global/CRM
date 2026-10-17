"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** MIYO-0649: add one candidate by hand. */
export function CandidateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const res = await fetch("/api/ats/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not save the candidate.");
        return;
      }
      toast.success("Candidate added.");
      router.push(`/ats/candidates/${body.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required maxLength={80} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" maxLength={80} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required maxLength={160} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" maxLength={20} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" maxLength={300} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currentCompany">Current company</Label>
          <Input id="currentCompany" name="currentCompany" maxLength={120} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="source">Where they came from</Label>
        <Input id="source" name="source" defaultValue="MANUAL" maxLength={60} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} maxLength={2000} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={busy}>
          Add candidate
        </Button>
      </div>
    </form>
  );
}
