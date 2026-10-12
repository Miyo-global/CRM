"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { AlertCircle, CalendarCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TokenPageShell, TokenState } from "../../_components/token-page-shell";

interface BookingData {
  candidateName: string;
  orgName: string;
  interviewType: string;
  durationMinutes: number;
  availableSlots: { start: string; end: string }[];
  notes: string | null;
}

type Status = "loading" | "ready" | "booking" | "success" | "error" | "expired";

export default function InterviewBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<BookingData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/public/interview-booking/${token}`)
      .then(async (res) => {
        if (res.status === 410) {
          setStatus("expired");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setErrorMsg("Booking link not found.");
          return;
        }
        const json = await res.json() as BookingData;
        setData(json);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Failed to load booking details.");
      });
  }, [token]);

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) return;
    setStatus("booking");
    try {
      const res = await fetch(`/api/public/interview-booking/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotStart: selectedSlot }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setErrorMsg(err.error ?? "Failed to book.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }, [selectedSlot, token]);

  return (
    <TokenPageShell
      title={status === "success" ? "Interview Confirmed!" : "Schedule Your Interview"}
      subtitle={data && status !== "success" ? data.orgName : undefined}
    >
          {status === "loading" && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32" />
            </div>
          )}

          {status === "expired" && (
            <TokenState icon={Clock} tone="warning" title="Link Expired">
              <p className="text-sm text-muted-foreground">
                This booking link has expired or has already been used. Please contact the recruiter for a new link.
              </p>
            </TokenState>
          )}

          {status === "error" && (
            <TokenState icon={AlertCircle} tone="danger" title="Error">
              <p className="text-sm text-muted-foreground" role="alert">{errorMsg}</p>
            </TokenState>
          )}

          {(status === "ready" || status === "booking") && data && (
            <>
              <div className="mb-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Hi <strong className="text-foreground">{data.candidateName}</strong>, please select a time for your{" "}
                  <strong className="text-foreground">{data.interviewType.toLowerCase().replace("_", " ")}</strong> interview
                  ({data.durationMinutes} min):
                </p>
                {data.notes && (
                  <p className="text-xs italic text-muted-foreground">{data.notes}</p>
                )}
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {data.availableSlots.map((slot) => {
                  const start = new Date(slot.start);
                  const isSelected = selectedSlot === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSlot(slot.start)}
                      className={cn(
                        "w-full rounded-md border px-4 py-3 text-left text-sm outline-none transition-[border-color,background-color,box-shadow] duration-100 focus-visible:focus-ring",
                        isSelected
                          ? "border-primary bg-brand-soft text-brand-soft-foreground ring-1 ring-primary"
                          : "border-border bg-card hover:border-border-strong hover:bg-accent",
                      )}
                    >
                      <span className="block font-medium">
                        {format(start, "EEEE, MMMM d, yyyy")}
                      </span>
                      <span className={cn("tabular-nums", isSelected ? "text-brand-soft-foreground" : "text-muted-foreground")}>
                        {format(start, "h:mm a")} – {format(new Date(slot.end), "h:mm a")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleConfirm}
                disabled={!selectedSlot || status === "booking"}
                loading={status === "booking"}
                className="mt-6 w-full"
              >
                {status === "booking" ? "Confirming..." : "Confirm Interview"}
              </Button>
            </>
          )}

          {status === "success" && data && (
            <TokenState icon={CalendarCheck} tone="success" title="Interview Scheduled!">
              {selectedSlot && (
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(selectedSlot), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                You will receive a confirmation email with further details. Thank you!
              </p>
            </TokenState>
          )}
    </TokenPageShell>
  );
}
