"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, FileText, Loader2, XCircle } from "lucide-react";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";
import { Button } from "@/components/ui/button";
import { TokenPageShell, TokenState } from "../../_components/token-page-shell";

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(DEFAULT_LOCALE, {
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
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(num);
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
    <TokenPageShell
      title={headerTitle}
      subtitle={data && status === "ready" ? data.orgName : undefined}
      className="max-w-xl"
    >
          {status === "loading" && (
            <div className="flex items-center justify-center py-12" aria-busy="true">
              <Loader2 className="size-8 text-brand-text motion-safe:animate-spin" aria-hidden="true" />
            </div>
          )}

          {status === "expired" && (
            <TokenState icon={Clock} tone="warning" title="This link has expired">
              <p className="text-sm text-muted-foreground">
                The offer acceptance link is no longer valid. Please contact the hiring team for assistance.
              </p>
            </TokenState>
          )}

          {status === "already_responded" && (
            <TokenState
              icon={alreadyDecision === "ACCEPTED" ? CheckCircle2 : XCircle}
              tone={alreadyDecision === "ACCEPTED" ? "success" : "neutral"}
              title={<>You&apos;ve already responded</>}
            >
              <p className="text-sm text-muted-foreground">
                {alreadyDecision === "ACCEPTED"
                  ? "You have already accepted this offer. Our team will be in touch with onboarding details."
                  : "You have already responded to this offer. Please contact the hiring team if you have questions."}
              </p>
            </TokenState>
          )}

          {status === "error" && (
            <TokenState icon={XCircle} tone="danger">
              <p className="text-sm text-danger-strong" role="alert">{errorMsg}</p>
            </TokenState>
          )}

          {status === "accepted" && (
            <TokenState icon={CheckCircle2} tone="success" title="Welcome to the team!">
              <p className="text-sm text-muted-foreground">
                Congratulations! You&apos;ve accepted the offer for <strong className="text-foreground">{data?.designation}</strong> at <strong className="text-foreground">{data?.orgName}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Our HR team will reach out shortly with onboarding details and joining instructions.
              </p>
            </TokenState>
          )}

          {status === "declined" && (
            <TokenState icon={XCircle} tone="neutral" title="Response recorded">
              <p className="text-sm text-muted-foreground">
                We&apos;ve noted your decision. Thank you for the time you invested in our hiring process.
              </p>
              <p className="text-sm text-muted-foreground">
                We wish you all the best in your future endeavours.
              </p>
            </TokenState>
          )}

          {(status === "ready" || status === "submitting") && data && (
            <div className="space-y-6">
              <div className="space-y-2 text-base leading-relaxed text-muted-foreground">
                <p>Dear <strong className="text-foreground">{data.candidateName}</strong>,</p>
                <p>
                  We are delighted to offer you the position of <strong className="text-foreground">{data.designation ?? "the offered role"}</strong> at <strong className="text-foreground">{data.orgName}</strong>. Please review the details below and respond at your earliest convenience.
                </p>
              </div>

              <dl className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
                {data.designation && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-muted-foreground">Designation</dt>
                    <dd className="text-right text-sm font-semibold text-foreground">{data.designation}</dd>
                  </div>
                )}
                {data.salary && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-muted-foreground">Offered CTC</dt>
                    <dd className="text-right text-sm font-semibold tabular-nums text-foreground">{formatSalary(data.salary)}</dd>
                  </div>
                )}
                {data.joiningDate && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-muted-foreground">Joining Date</dt>
                    <dd className="text-right text-sm font-semibold tabular-nums text-foreground">{formatDate(data.joiningDate)}</dd>
                  </div>
                )}
                {data.validUntil && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-muted-foreground">Offer Valid Until</dt>
                    <dd className="text-right text-sm font-semibold tabular-nums text-warning-strong">{formatDate(data.validUntil)}</dd>
                  </div>
                )}
              </dl>

              {data.offerLetterUrl && (
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={data.offerLetterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText aria-hidden="true" />
                    View Offer Letter
                  </a>
                </Button>
              )}

              <div className="sticky bottom-0 -mx-6 -mb-6 space-y-3 rounded-b-lg border-t border-border bg-card/90 px-6 py-4 backdrop-blur">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={status === "submitting"}
                    onClick={() => handleDecision("DECLINED")}
                    className="text-danger-strong hover:bg-danger-soft hover:text-danger-strong"
                  >
                    Decline
                  </Button>
                  <Button
                    size="lg"
                    disabled={status === "submitting"}
                    onClick={() => handleDecision("ACCEPTED")}
                  >
                    {status === "submitting" ? "Submitting…" : "Accept Offer"}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  By clicking &ldquo;Accept Offer&rdquo; you confirm acceptance of the terms presented above.
                </p>
              </div>
            </div>
          )}
    </TokenPageShell>
  );
}
