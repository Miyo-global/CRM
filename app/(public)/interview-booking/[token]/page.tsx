"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";

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
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-[#0f2b7f] text-white rounded-t-xl px-6 py-8 text-center">
          <h1 className="text-2xl font-bold">
            {status === "success" ? "Interview Confirmed!" : "Schedule Your Interview"}
          </h1>
          {data && status !== "success" && (
            <p className="text-white/70 text-sm mt-1">{data.orgName}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl px-6 py-6">
          {status === "loading" && (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
            </div>
          )}

          {status === "expired" && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-gray-600">Link Expired</p>
              <p className="text-sm text-gray-400 mt-2">
                This booking link has expired or has already been used. Please contact the recruiter for a new link.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-red-600">Error</p>
              <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
            </div>
          )}

          {(status === "ready" || status === "booking") && data && (
            <>
              <div className="mb-4 space-y-1">
                <p className="text-sm text-gray-500">
                  Hi <strong>{data.candidateName}</strong>, please select a time for your{" "}
                  <strong>{data.interviewType.toLowerCase().replace("_", " ")}</strong> interview
                  ({data.durationMinutes} min):
                </p>
                {data.notes && (
                  <p className="text-xs text-gray-400 italic">{data.notes}</p>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.availableSlots.map((slot) => {
                  const start = new Date(slot.start);
                  const isSelected = selectedSlot === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelectedSlot(slot.start)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                        isSelected
                          ? "border-[#0f2b7f] bg-blue-50 font-semibold"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <span className="block font-medium">
                        {format(start, "EEEE, MMMM d, yyyy")}
                      </span>
                      <span className="text-gray-500">
                        {format(start, "h:mm a")} – {format(new Date(slot.end), "h:mm a")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedSlot || status === "booking"}
                className="mt-6 w-full py-3 rounded-lg bg-[#0f2b7f] text-white font-semibold text-sm hover:bg-[#0d2266] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status === "booking" ? "Confirming..." : "Confirm Interview"}
              </button>
            </>
          )}

          {status === "success" && data && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800">Interview Scheduled!</p>
              {selectedSlot && (
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedSlot), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              <p className="text-xs text-gray-400">
                You will receive a confirmation email with further details. Thank you!
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
