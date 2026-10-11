"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCandidateOffers,
  useCreateCandidateOffer,
  useUpdateCandidateOffer,
  useDeleteCandidateOffer,
  useSubmitOfferForCeoApproval,
  useCeoReviewOffer,
  useOfferLetterTemplates,
  useGenerateOfferLetter,
  type CandidateOffer,
} from "@/lib/api/hooks/hr/recruitment";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, Send, CheckCircle2, XCircle, Eye, FileText, AlertTriangle, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { HR_ROLES, isCEO } from "@/lib/constants/roles";
import {
  OFFER_STATUS_LABELS,
  PATCH_OFFER_TRANSITIONS,
  type CandidateOfferStatus,
} from "@/lib/constants/candidate-offers";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

const OFFER_STATUS_TONE: Record<CandidateOfferStatus, Tone> = {
  DRAFT: "neutral",
  PENDING_CEO: "warning",
  CEO_APPROVED: "success",
  CEO_REJECTED: "danger",
  SENT: "info",
  VIEWED: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
  COUNTERED: "plum",
  EXPIRED: "neutral",
};

const STATUS_ICONS: Partial<Record<CandidateOfferStatus, React.ReactNode>> = {
  SENT: <Send className="size-3" />,
  VIEWED: <Eye className="size-3" />,
  ACCEPTED: <CheckCircle2 className="size-3" />,
  DECLINED: <XCircle className="size-3" />,
  PENDING_CEO: <AlertTriangle className="size-3" />,
  CEO_REJECTED: <XCircle className="size-3" />,
};

function formatINR(val: string | null) {
  if (!val) return "";
  const num = Number(val);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(num);
}

interface Props {
  candidateId: number;
}

function GenerateLetterDialog({
  candidateId,
  offer,
  onClose,
}: {
  candidateId: number;
  offer: CandidateOffer;
  onClose: () => void;
}) {
  const { data: templates, isLoading: tplLoading } = useOfferLetterTemplates();
  const generateLetter = useGenerateOfferLetter(candidateId);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const sheetPortalRef = useRef<HTMLDivElement>(null);

  const defaultTplId = templates?.find((t) => t.isDefault)?.id;
  const effectiveSelected = selectedTemplateId || (defaultTplId ? String(defaultTplId) : "");

  const templateOptions = useMemo(
    () =>
      (templates ?? []).map((t) => ({
        value: String(t.id),
        label: `${t.name}${t.isDefault ? " (default)" : ""}`,
        keywords: t.description ?? undefined,
      })),
    [templates],
  );

  const resolveTemplateId = useCallback(
    () => Number(selectedTemplateId || defaultTplId || 0),
    [selectedTemplateId, defaultTplId],
  );

  useEffect(() => {
    setPreviewTemplateId(null);
    setPreviewError(false);
  }, [effectiveSelected]);

  const previewSrc = previewTemplateId
    ? `/api/hr/recruitment/candidates/${candidateId}/offers/${offer.id}/generate-letter/preview?templateId=${previewTemplateId}`
    : null;

  const handlePreview = useCallback(() => {
    const tplId = resolveTemplateId();
    if (!tplId) { toast.error("Select a template first"); return; }
    setPreviewError(false);
    setPreviewTemplateId(tplId);
  }, [resolveTemplateId]);

  const handleGenerate = useCallback(async () => {
    const tplId = resolveTemplateId();
    if (!tplId) { toast.error("Select a template first"); return; }
    generateLetter.mutate(
      { offerId: offer.id, templateId: tplId },
      {
        onSuccess: () => { toast.success("Offer letter generated and attached"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [resolveTemplateId, offer.id, generateLetter, onClose]);

  const sheetPopoverContainer = sheetPortalRef.current;

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent size="lg" className="flex flex-col gap-0 p-0">
        <div ref={sheetPortalRef} className="flex min-h-0 flex-1 flex-col">
        <SheetHeader className="shrink-0 border-b border-border">
          <SheetTitle>Generate Offer Letter</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template</label>
            {tplLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <SearchableSelect
                options={templateOptions}
                value={effectiveSelected}
                onValueChange={setSelectedTemplateId}
                placeholder="Select a template…"
                searchPlaceholder="Search templates…"
                emptyText="No templates found."
                popoverContainer={sheetPopoverContainer}
              />
            )}
            {!templates?.length && !tplLoading && (
              <p className="text-xs text-muted-foreground">
                No templates yet. Visit HR &rsaquo; Offer Letter Templates to create one.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!effectiveSelected}
          >
            <Eye aria-hidden="true" />
            Preview PDF
          </Button>

          {previewSrc && !previewError && (
            <iframe
              src={`${previewSrc}#toolbar=0&navpanes=0`}
              className="h-80 w-full rounded-md border border-border bg-surface-sunken"
              title="Offer letter preview"
              onError={() => setPreviewError(true)}
            />
          )}

          {previewSrc && previewError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-sunken/40 px-4 py-8 text-center">
              <IconChip icon={FileText} tone="neutral" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t preview this letter inline.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href={previewSrc} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={!effectiveSelected}
            loading={generateLetter.isPending}
          >
            <FileText aria-hidden="true" />
            Generate &amp; Attach
          </Button>
        </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function OffersTab({ candidateId }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const userIsHR = !!role && HR_ROLES.includes(role);
  const userIsCEO = isCEO(role);

  const { data: offers, isLoading } = useCandidateOffers(candidateId);
  const createOffer = useCreateCandidateOffer(candidateId);
  const updateOffer = useUpdateCandidateOffer(candidateId);
  const deleteOffer = useDeleteCandidateOffer(candidateId);
  const submitForCeo = useSubmitOfferForCeoApproval(candidateId);
  const ceoReview = useCeoReviewOffer(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [offeredSalary, setOfferedSalary] = useState("");
  const [offeredDesignation, setOfferedDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [generateOffer, setGenerateOffer] = useState<CandidateOffer | null>(null);
  const [deleteOfferId, setDeleteOfferId] = useState<number | null>(null);
  const [submitOfferId, setSubmitOfferId] = useState<number | null>(null);
  const [sendOfferId, setSendOfferId] = useState<number | null>(null);
  const [reviewOffer, setReviewOffer] = useState<CandidateOffer | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [ceoRemarks, setCeoRemarks] = useState("");

  const handleCreate = () => {
    if (offeredSalary) {
      const salary = Number(offeredSalary);
      if (!Number.isFinite(salary) || salary <= 0) {
        toast.error("Offered salary must be a positive amount");
        return;
      }
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (joiningDate) {
      const joining = new Date(`${joiningDate}T00:00:00`);
      const earliestJoining = new Date(startOfToday);
      earliestJoining.setDate(earliestJoining.getDate() - 7);
      if (Number.isNaN(joining.getTime()) || joining < earliestJoining) {
        toast.error("Joining date can't be more than a week before today");
        return;
      }
    }
    if (validUntil) {
      const until = new Date(`${validUntil}T00:00:00`);
      if (Number.isNaN(until.getTime()) || until < startOfToday) {
        toast.error("Valid-until date can't be in the past");
        return;
      }
    }
    createOffer.mutate(
      {
        offeredSalary: offeredSalary ? Number(offeredSalary) : undefined,
        offeredDesignation: offeredDesignation || undefined,
        joiningDate: joiningDate || undefined,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Offer created");
          setSheetOpen(false);
          setOfferedSalary(""); setOfferedDesignation(""); setJoiningDate("");
          setValidUntil(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleStatusChange = (offerId: number, offerStatus: CandidateOffer["offerStatus"]) => {
    updateOffer.mutate(
      { offerId, offerStatus },
      {
        onSuccess: () => toast.success("Offer status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleDelete = () => {
    if (deleteOfferId == null) return;
    deleteOffer.mutate(deleteOfferId, {
      onSuccess: () => { toast.success("Offer deleted"); setDeleteOfferId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const handleSubmitForCeo = () => {
    if (submitOfferId == null) return;
    submitForCeo.mutate(submitOfferId, {
      onSuccess: () => {
        toast.success("Submitted for CEO approval");
        setSubmitOfferId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const handleSendToCandidate = () => {
    if (sendOfferId == null) return;
    updateOffer.mutate(
      { offerId: sendOfferId, offerStatus: "SENT" },
      {
        onSuccess: () => {
          toast.success("Offer sent to candidate");
          setSendOfferId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleOpenCeoReview = (offer: CandidateOffer, decision: "approve" | "reject") => {
    setReviewOffer(offer);
    setReviewDecision(decision);
    setCeoRemarks("");
  };

  const handleCeoReviewSubmit = () => {
    if (!reviewOffer || !reviewDecision) return;
    if (reviewDecision === "reject" && !ceoRemarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }
    ceoReview.mutate(
      {
        offerId: reviewOffer.id,
        decision: reviewDecision,
        remarks: ceoRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(reviewDecision === "approve" ? "Offer approved" : "Offer rejected");
          setReviewOffer(null);
          setReviewDecision(null);
          setCeoRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Track offer letters and candidate responses</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus aria-hidden="true" />Create Offer
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      ) : !offers?.length ? (
        <EmptyState
          compact
          illustration={<EmptyDocumentsIllustration className="size-24" />}
          title="No offers created yet."
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const status = offer.offerStatus as CandidateOfferStatus;
            const nextStatuses = PATCH_OFFER_TRANSITIONS[status] ?? [];
            return (
              <div key={offer.id} className="rounded-lg border border-border p-4">
                <div>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={OFFER_STATUS_TONE[status] ?? "neutral"}>
                          {STATUS_ICONS[status]}
                          {OFFER_STATUS_LABELS[status]}
                        </StatusPill>
                        {offer.validUntil && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            Valid until {format(new Date(offer.validUntil), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {offer.offeredDesignation && (
                        <p className="text-sm font-medium">{offer.offeredDesignation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(status === "DRAFT" || status === "CEO_REJECTED") && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setGenerateOffer(offer)}
                        >
                          <FileText aria-hidden="true" />
                          Generate Letter
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteOfferId(offer.id)}
                        aria-label="Delete offer"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3 rounded-md bg-surface-sunken p-3 text-xs tabular-nums sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Salary</p>
                      <p className="font-medium">{formatINR(offer.offeredSalary)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joining Date</p>
                      <p className="font-medium">
                        {offer.joiningDate ? format(new Date(offer.joiningDate), "dd MMM yyyy") : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sent At</p>
                      <p className="font-medium">
                        {offer.sentAt ? format(new Date(offer.sentAt), "dd MMM yyyy") : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response</p>
                      <p className="font-medium">
                        {offer.respondedAt ? format(new Date(offer.respondedAt), "dd MMM yyyy") : ""}
                      </p>
                    </div>
                  </div>

                  {offer.submittedForCeoAt && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Submitted for CEO: {format(new Date(offer.submittedForCeoAt), "dd MMM yyyy, h:mm a")}
                    </p>
                  )}
                  {offer.ceoReviewedAt && (
                    <p className="text-xs text-muted-foreground mb-2">
                      CEO reviewed: {format(new Date(offer.ceoReviewedAt), "dd MMM yyyy, h:mm a")}
                    </p>
                  )}
                  {status === "CEO_REJECTED" && offer.ceoRemarks && (
                    <p className="mb-2 text-xs text-danger-strong">
                      CEO remarks: {offer.ceoRemarks}
                    </p>
                  )}

                  {offer.offerLetterUrl && (
                    <a
                      href={
                        offer.offerLetterUrl.startsWith("o/")
                          ? `/api/storage/download?key=${encodeURIComponent(offer.offerLetterUrl)}&attachment=1`
                          : offer.offerLetterUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 inline-block rounded-sm text-xs font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
                    >
                      View Offer Letter →
                    </a>
                  )}

                  {offer.notes && (
                    <p className="text-xs text-muted-foreground mb-3">{offer.notes}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {userIsHR && (status === "DRAFT" || status === "CEO_REJECTED") && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSubmitOfferId(offer.id)}
                        disabled={!offer.offerLetterUrl || submitForCeo.isPending}
                      >
                        <AlertTriangle aria-hidden="true" />
                        {status === "CEO_REJECTED" ? "Resubmit for CEO Approval" : "Submit for CEO Approval"}
                      </Button>
                    )}

                    {userIsCEO && status === "PENDING_CEO" && (
                      <>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenCeoReview(offer, "approve")}
                        >
                          <CheckCircle2 aria-hidden="true" />
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleOpenCeoReview(offer, "reject")}
                        >
                          <XCircle aria-hidden="true" />
                          Reject
                        </Button>
                      </>
                    )}

                    {userIsHR && status === "CEO_APPROVED" && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSendOfferId(offer.id)}
                        disabled={updateOffer.isPending}
                      >
                        <Send aria-hidden="true" />
                        Send to Candidate
                      </Button>
                    )}

                    {nextStatuses.length > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">Update status:</span>
                        <Select
                          value={offer.offerStatus}
                          onValueChange={(v) => handleStatusChange(offer.id, v as CandidateOffer["offerStatus"])}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs" aria-label="Update status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={offer.offerStatus} className="text-xs">
                              {OFFER_STATUS_LABELS[status]}
                            </SelectItem>
                            {nextStatuses.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {OFFER_STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {generateOffer && (
        <GenerateLetterDialog
          candidateId={candidateId}
          offer={generateOffer}
          onClose={() => setGenerateOffer(null)}
        />
      )}

      <ConfirmActionDialog
        open={deleteOfferId != null}
        onOpenChange={(o) => { if (!o) setDeleteOfferId(null); }}
        title="Delete offer?"
        description="This will permanently delete this offer. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteOffer.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmActionDialog
        open={submitOfferId !== null}
        onOpenChange={(o) => { if (!o) setSubmitOfferId(null); }}
        title="Submit for CEO Approval"
        description="Submit this offer letter for CEO review? The offer will move to Pending CEO status."
        confirmLabel="Submit"
        isPending={submitForCeo.isPending}
        onConfirm={handleSubmitForCeo}
      />

      <ConfirmActionDialog
        open={sendOfferId !== null}
        onOpenChange={(o) => { if (!o) setSendOfferId(null); }}
        title="Send Offer to Candidate"
        description="Send this offer to the candidate? An email with the acceptance link will be sent."
        confirmLabel="Send"
        isPending={updateOffer.isPending}
        onConfirm={handleSendToCandidate}
      />

      <Sheet
        open={reviewOffer !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReviewOffer(null);
            setReviewDecision(null);
            setCeoRemarks("");
          }
        }}
      >
        <SheetContent size="md" className="flex flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 border-b border-border">
            <SheetTitle>
              {reviewDecision === "approve" ? "Approve Offer" : "Reject Offer"}
            </SheetTitle>
            <SheetDescription>
              Review the offer details before making a decision.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {reviewOffer && (
              <>
                <div className="space-y-1 rounded-md bg-surface-sunken p-3 text-sm tabular-nums">
                  {reviewOffer.offeredDesignation && (
                    <p><span className="text-muted-foreground">Role:</span> {reviewOffer.offeredDesignation}</p>
                  )}
                  {reviewOffer.offeredSalary && (
                    <p><span className="text-muted-foreground">Salary:</span> {formatINR(reviewOffer.offeredSalary)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    CEO Remarks{" "}
                    {reviewDecision === "reject" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    )}
                  </Label>
                  <Textarea
                    placeholder={
                      reviewDecision === "reject"
                        ? "Remarks are required when rejecting…"
                        : "Add any remarks or comments…"
                    }
                    value={ceoRemarks}
                    onChange={(e) => setCeoRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewOffer(null);
                setReviewDecision(null);
                setCeoRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCeoReviewSubmit}
              loading={ceoReview.isPending}
              variant={reviewDecision === "reject" ? "destructive" : "default"}
            >
              {reviewDecision === "approve" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              {reviewDecision === "approve" ? "Approve" : "Reject"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent size="md" className="flex flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 border-b border-border">
            <SheetTitle>Create Offer</SheetTitle>
            <SheetDescription>Create an offer for this candidate.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Designation</label>
              <Input placeholder="e.g. Senior Developer" value={offeredDesignation} onChange={(e) => setOfferedDesignation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Salary (₹/year)</label>
              <Input type="number" min={1} step={10000} placeholder="e.g. 1200000" value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Joining Date</label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valid Until</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Any additional notes..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createOffer.isPending}>
              Create Offer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
