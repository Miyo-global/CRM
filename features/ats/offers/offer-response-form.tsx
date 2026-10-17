"use client";

import { useState } from "react";

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

/** MIYO-0662: accept with a typed name, or decline with a reason. */
export function OfferResponseForm({ token }: { token: string }) {
  const [decision, setDecision] = useState<"accept" | "decline" | null>(null);
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!decision) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/ats/offer-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          signedName: signedName.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not record your answer.");
        return;
      }
      setDone(decision);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 border-l-2 border-border pl-4">
        <p className="font-medium text-foreground">
          {done === "accept" ? "Thank you — we have your acceptance." : "Thank you for telling us."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {done === "accept"
            ? "HR will write with your joining details."
            : "We have let the hiring team know."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setDecision("accept")}
          className={`rounded-md border px-4 py-2 text-sm ${
            decision === "accept"
              ? "border-foreground bg-foreground text-background"
              : "border-border text-foreground"
          }`}
        >
          Accept the offer
        </button>
        <button
          type="button"
          onClick={() => setDecision("decline")}
          className={`rounded-md border px-4 py-2 text-sm ${
            decision === "decline"
              ? "border-foreground bg-foreground text-background"
              : "border-border text-foreground"
          }`}
        >
          Decline
        </button>
      </div>

      {decision === "accept" && (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-foreground">Type your full name</span>
            <input
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              className={input}
              maxLength={120}
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            <span>I accept this offer and the terms in the letter.</span>
          </label>
        </div>
      )}

      {decision === "decline" && (
        <label className="grid gap-2 text-sm">
          <span className="text-foreground">Anything you would like to tell us (optional)</span>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={input}
            maxLength={1000}
          />
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {decision && (
        <div>
          <button
            type="button"
            disabled={busy || (decision === "accept" && (!signedName.trim() || !agreed))}
            onClick={() => void send()}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {decision === "accept" ? "Send my acceptance" : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
