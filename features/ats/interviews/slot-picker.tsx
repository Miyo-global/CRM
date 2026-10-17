"use client";

import { useState } from "react";

/** MIYO-0660: the candidate picks one of the offered times. */
export function SlotPicker({
  token,
  slots,
}: {
  token: string;
  slots: { start: string; label: string }[];
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function book() {
    if (!chosen) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/ats/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, start: chosen }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not book that time.");
        return;
      }
      setBooked(slots.find((s) => s.start === chosen)?.label ?? "your slot");
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <div className="mt-8 border-l-2 border-border pl-4">
        <p className="font-medium text-foreground">Booked for {booked}.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A calendar invite is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      <ul className="grid gap-2">
        {slots.map((slot) => (
          <li key={slot.start}>
            <button
              type="button"
              onClick={() => setChosen(slot.start)}
              className={`w-full rounded-md border px-4 py-3 text-left text-sm ${
                chosen === slot.start
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground"
              }`}
            >
              {slot.label}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <button
          type="button"
          disabled={!chosen || busy}
          onClick={() => void book()}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Book this time
        </button>
      </div>
    </div>
  );
}
