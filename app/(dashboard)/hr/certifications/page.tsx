"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useCertifications, useCreateCertification, type Certification } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Plus, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

export default function CertificationsPage() {
  const { data: certs, isLoading, isError, error, refetch } = useCertifications();
  const create = useCreateCertification();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Certification name is required"); return; }
    create.mutate(
      {
        name: name.trim(), issuingOrganization: org || undefined,
        issueDate: issueDate || undefined, expiryDate: expiryDate || undefined,
        credentialId: credentialId || undefined, credentialUrl: credentialUrl || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Certification added");
          setSheetOpen(false); setName(""); setOrg(""); setIssueDate(""); setExpiryDate("");
          setCredentialId(""); setCredentialUrl("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, org, issueDate, expiryDate, credentialId, credentialUrl, create]);

  if (isLoading) {
    return (
      <PageWrapper title="Certifications">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Certifications"
      badge={`${certs?.length ?? 0} certifications`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Add Certification</Button>}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !certs?.length ? (
        <EmptyState
          title="No certifications recorded yet."
          action={{ label: "Add Certification", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {certs.map((cert: Certification) => {
            const daysToExpiry = cert.expiryDate ? differenceInDays(new Date(cert.expiryDate), new Date()) : null;
            const expiring = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
            const expired = daysToExpiry !== null && daysToExpiry <= 0;
            return (
              <Card key={cert.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    {expired && <StatusPill tone="danger" dot>Expired</StatusPill>}
                    {expiring && <StatusPill tone="warning"><AlertTriangle aria-hidden="true" />Expiring</StatusPill>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-tight text-foreground">{cert.name}</h3>
                    {cert.issuingOrganization && <p className="mt-0.5 truncate text-xs text-muted-foreground" title={cert.issuingOrganization}>{cert.issuingOrganization}</p>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    {cert.user?.name && <span className="font-medium text-foreground">{cert.user.name}</span>}
                    {cert.issueDate && <span className="flex items-center gap-1"><Calendar className="size-3" aria-hidden="true" />{format(new Date(cert.issueDate), "MMM yyyy")}</span>}
                    {cert.expiryDate && <span>Exp: {format(new Date(cert.expiryDate), "MMM yyyy")}</span>}
                  </div>
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:underline focus-visible:focus-ring rounded-sm">
                      <ExternalLink className="size-3" aria-hidden="true" />View Credential
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add certification" onSubmit={handleCreate} submitLabel="Add" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Certification Name</label>
          <Input placeholder="e.g., AWS Solutions Architect" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Issuing Organization</label>
          <Input placeholder="e.g., Amazon Web Services" value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Issue Date</label>
            <DatePicker value={issueDate} onChange={setIssueDate} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expiry Date</label>
            <DatePicker value={expiryDate} onChange={setExpiryDate} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Credential ID</label>
          <Input placeholder="Certificate ID" value={credentialId} onChange={(e) => setCredentialId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Credential URL</label>
          <Input placeholder="https://..." value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
