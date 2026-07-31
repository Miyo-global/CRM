"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus, Trash2, Send, CheckCircle2, XCircle, Eye, FileText, Loader2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { HR_ROLES, isCEO } from "@/lib/constants/roles";
import {
  OFFER_STATUS_LABELS,
  OFFER_STATUS_VARIANTS,
  PATCH_OFFER_TRANSITIONS,
  type CandidateOfferStatus,
} from "@/lib/constants/candidate-offers";

const STATUS_ICONS: Partial<Record<CandidateOfferStatus, React.ReactNode>> = {
  SENT: <Send className="h-3 w-3" />,
  VIEWED: <Eye className="h-3 w-3" />,
  ACCEPTED: <CheckCircle2 className="h-3 w-3" />,
  DECLINED: <XCircle className="h-3 w-3" />,
  PENDING_CEO: <AlertTriangle className="h-3 w-3" />,
  CEO_REJECTED: <XCircle className="h-3 w-3" />,
};

function formatINR(val: string | null) {
  if (!val) return "";
  const num = Number(val);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
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
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
        <div ref={sheetPortalRef} className="flex min-h-0 flex-1 flex-col">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Generate Offer Letter</SheetTitle>
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
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview PDF
          </Button>

          {previewSrc && !previewError && (
            <iframe
              src={`${previewSrc}#toolbar=0&navpanes=0`}
              className="w-full h-80 rounded border bg-muted/30"
              title="Offer letter preview"
              onError={() => setPreviewError(true)}
            />
          )}

          {previewSrc && previewError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t preview this letter inline.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href={previewSrc} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={!effectiveSelected || generateLetter.isPending}
          >
            {generateLetter.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track offer letters and candidate responses</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Create Offer
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !offers?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No offers created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const status = offer.offerStatus as CandidateOfferStatus;
            const nextStatuses = PATCH_OFFER_TRANSITIONS[status] ?? [];
            return (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={OFFER_STATUS_VARIANTS[status]} className="gap-1 text-xs">
                          {STATUS_ICONS[status]}
                          {OFFER_STATUS_LABELS[status]}
                        </Badge>
                        {offer.validUntil && (
                          <span className="text-xs text-muted-foreground">
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
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setGenerateOffer(offer)}
                        >
                          <FileText className="h-3 w-3" />
                          Generate Letter
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteOfferId(offer.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
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
                    <p className="text-xs text-destructive mb-2">
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
                      className="text-xs text-primary hover:underline block mb-3"
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
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setSubmitOfferId(offer.id)}
                        disabled={!offer.offerLetterUrl || submitForCeo.isPending}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {status === "CEO_REJECTED" ? "Resubmit for CEO Approval" : "Submit for CEO Approval"}
                      </Button>
                    )}

                    {userIsCEO && status === "PENDING_CEO" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleOpenCeoReview(offer, "approve")}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleOpenCeoReview(offer, "reject")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {userIsHR && status === "CEO_APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setSendOfferId(offer.id)}
                        disabled={updateOffer.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
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
                          <SelectTrigger className="h-7 text-xs w-36">
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
                </CardContent>
              </Card>
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
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">
              {reviewDecision === "approve" ? "Approve Offer" : "Reject Offer"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Review the offer details before making a decision.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {reviewOffer && (
              <>
                <div className="text-sm space-y-1">
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
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
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
              disabled={ceoReview.isPending}
              variant={reviewDecision === "reject" ? "destructive" : "default"}
            >
              {ceoReview.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : reviewDecision === "approve" ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mr-1" />
              )}
              {reviewDecision === "approve" ? "Approve" : "Reject"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Create Offer</SheetTitle>
            <SheetDescription className="text-xs">Create an offer for this candidate.</SheetDescription>
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
            <div className="grid grid-cols-2 gap-3">
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
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={createOffer.isPending}>
              {createOffer.isPending ? "Creating..." : "Create Offer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
