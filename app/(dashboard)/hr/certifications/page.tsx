"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useCertifications, useCreateCertification, type Certification } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Plus, Award, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

export default function CertificationsPage() {
  const { data: certs, isLoading } = useCertifications();
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
      <PageWrapper title="Certifications" subtitle="Employee certifications and credentials">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Certifications"
      subtitle="Track professional certifications and renewals"
      badge={`${certs?.length ?? 0} certifications`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Certification</Button>}
    >
      {!certs?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyDocumentsIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No certifications recorded yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert: Certification) => {
            const daysToExpiry = cert.expiryDate ? differenceInDays(new Date(cert.expiryDate), new Date()) : null;
            const expiring = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
            const expired = daysToExpiry !== null && daysToExpiry <= 0;
            return (
              <Card key={cert.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <Award className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                    {expiring && <Badge variant="outline" className="text-[10px] text-amber-600"><AlertTriangle className="h-3 w-3 mr-0.5" />Expiring</Badge>}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{cert.name}</h3>
                    {cert.issuingOrganization && <p className="text-xs text-muted-foreground mt-0.5">{cert.issuingOrganization}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {cert.user?.name && <span>{cert.user.name}</span>}
                    {cert.issueDate && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{format(new Date(cert.issueDate), "MMM yyyy")}</span>}
                    {cert.expiryDate && <span>Exp: {format(new Date(cert.expiryDate), "MMM yyyy")}</span>}
                  </div>
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <ExternalLink className="h-3 w-3" />View Credential
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add Certification" onSubmit={handleCreate} submitLabel="Add" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Certification Name</label>
          <Input placeholder="e.g., AWS Solutions Architect" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Issuing Organization</label>
          <Input placeholder="e.g., Amazon Web Services" value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Issue Date</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
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
