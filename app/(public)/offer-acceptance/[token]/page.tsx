"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface OfferData {
  candidateName: string;
  orgName: string;
  orgLogo: string | null;
  designation: string | null;
  salary: string | null;
  joiningDate: string | null;
  validUntil: string | null;
  offerLetterUrl: string | null;
  offerStatus: string;
}

type Status =
  | "loading"
  | "ready"
  | "submitting"
  | "accepted"
  | "declined"
  | "expired"
  | "already_responded"
  | "error";

const CheckIcon = () => (
  <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-16 w-16 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FileIcon = () => (
  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatSalary(salary: string | null): string {
  if (!salary) return "";
  const num = parseFloat(salary);
  if (isNaN(num)) return salary;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function OfferAcceptancePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<OfferData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyDecision, setAlreadyDecision] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/offer-acceptance/${token}`)
      .then(async (res) => {
        const json = await res.json() as { error?: string; alreadyResponded?: boolean; decision?: string } & Partial<OfferData>;
        if (res.status === 410) {
          if (json.alreadyResponded) {
            setAlreadyDecision(json.decision ?? null);
            setStatus("already_responded");
          } else {
            setStatus("expired");
          }
          return;
        }
        if (!res.ok) {
          setErrorMsg(json.error ?? "Failed to load offer details.");
          setStatus("error");
          return;
        }
        setData(json as OfferData);
        setStatus("ready");
      })
      .catch(() => {
        setErrorMsg("Failed to load offer details. Please try again.");
        setStatus("error");
      });
  }, [token]);

  const handleDecision = useCallback(async (decision: "ACCEPTED" | "DECLINED") => {
    setStatus("submitting");
    try {
      const res = await fetch(`/api/public/offer-acceptance/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json() as { error?: string; alreadyResponded?: boolean };
      if (res.status === 410 && json.alreadyResponded) {
        setStatus("already_responded");
        return;
      }
      if (!res.ok) {
        setErrorMsg(json.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus(decision === "ACCEPTED" ? "accepted" : "declined");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }, [token]);

  const headerTitle =
    status === "accepted" ? "Offer Accepted!" :
    status === "declined" ? "Response Recorded" :
    status === "expired" ? "Link Expired" :
    status === "already_responded" ? "Already Responded" :
    "Your Offer Letter";

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4 pb-16">
      <div className="w-full max-w-md">
        <div className="bg-[#0f2b7f] text-white rounded-t-xl px-6 py-8 text-center">
          <h1 className="text-2xl font-bold">{headerTitle}</h1>
          {data && status === "ready" && (
            <p className="text-white/70 text-sm mt-1">{data.orgName}</p>
          )}
        </div>

        <div className="bg-white rounded-b-xl shadow-lg px-6 py-8">
          {status === "loading" && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-[#0f2b7f] border-t-transparent animate-spin" />
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <ClockIcon />
              <h2 className="text-lg font-semibold text-gray-800">This link has expired</h2>
              <p className="text-sm text-gray-500">
                The offer acceptance link is no longer valid. Please contact the hiring team for assistance.
              </p>
            </div>
          )}

          {status === "already_responded" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              {alreadyDecision === "ACCEPTED" ? <CheckIcon /> : <XCircleIcon />}
              <h2 className="text-lg font-semibold text-gray-800">You&apos;ve already responded</h2>
              <p className="text-sm text-gray-500">
                {alreadyDecision === "ACCEPTED"
                  ? "You have already accepted this offer. Our team will be in touch with onboarding details."
                  : "You have already responded to this offer. Please contact the hiring team if you have questions."}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <XCircleIcon />
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          {status === "accepted" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckIcon />
              <h2 className="text-lg font-semibold text-gray-800">Welcome to the team!</h2>
              <p className="text-sm text-gray-600">
                Congratulations! You&apos;ve accepted the offer for <strong>{data?.designation}</strong> at <strong>{data?.orgName}</strong>.
              </p>
              <p className="text-sm text-gray-500">
                Our HR team will reach out shortly with onboarding details and joining instructions.
              </p>
            </div>
          )}

          {status === "declined" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <XCircleIcon />
              <h2 className="text-lg font-semibold text-gray-800">Response recorded</h2>
              <p className="text-sm text-gray-600">
                We&apos;ve noted your decision. Thank you for the time you invested in our hiring process.
              </p>
              <p className="text-sm text-gray-500">
                We wish you all the best in your future endeavours.
              </p>
            </div>
          )}

          {(status === "ready" || status === "submitting") && data && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Dear <strong>{data.candidateName}</strong>,</p>
                <p className="text-sm text-gray-600">
                  We are delighted to offer you the position of <strong>{data.designation ?? "the offered role"}</strong> at <strong>{data.orgName}</strong>. Please review the details below and respond at your earliest convenience.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                {data.designation && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-gray-500 font-medium">Designation</span>
                    <span className="text-sm font-semibold text-gray-800">{data.designation}</span>
                  </div>
                )}
                {data.salary && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-gray-500 font-medium">Offered CTC</span>
                    <span className="text-sm font-semibold text-gray-800">{formatSalary(data.salary)}</span>
                  </div>
                )}
                {data.joiningDate && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-gray-500 font-medium">Joining Date</span>
                    <span className="text-sm font-semibold text-gray-800">{formatDate(data.joiningDate)}</span>
                  </div>
                )}
                {data.validUntil && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-gray-500 font-medium">Offer Valid Until</span>
                    <span className="text-sm font-semibold text-amber-600">{formatDate(data.validUntil)}</span>
                  </div>
                )}
              </div>

              {data.offerLetterUrl && (
                <a
                  href={data.offerLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full border border-[#0f2b7f] text-[#0f2b7f] rounded-lg py-2.5 text-sm font-medium hover:bg-[#0f2b7f]/5 transition-colors"
                >
                  <FileIcon />
                  View Offer Letter
                </a>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={status === "submitting"}
                  onClick={() => handleDecision("DECLINED")}
                  className="rounded-lg border border-red-300 text-red-600 py-3 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Decline
                </button>
                <button
                  disabled={status === "submitting"}
                  onClick={() => handleDecision("ACCEPTED")}
                  className="rounded-lg bg-green-600 text-white py-3 text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Submitting…" : "Accept Offer"}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                By clicking &ldquo;Accept Offer&rdquo; you confirm acceptance of the terms presented above.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
