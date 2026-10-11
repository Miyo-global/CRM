"use client";

import { useState, use, useCallback } from "react";
import Link from "next/link";
import {
  Building2, Globe, Users, Link2, Mail, Phone,
  ChevronLeft, TrendingUp, BarChart2, UserCircle, GitBranch,
  Clock, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useCrmOrganizationDetail,
  useCrmOrgHierarchy,
  useCrmOrgRollup,
  useCrmOrgTimeline,
  useCrmOrgRelatedLeads,
} from "@/lib/api/hooks/crm";
import { AccountHealthBadge, computeHealthScore } from "@/features/crm/organizations/detail/account-health-badge";
import { HierarchyTree } from "@/features/crm/organizations/detail/hierarchy-tree";
import { AccountTimeline } from "@/features/crm/organizations/detail/account-timeline";
import { AccountNotes } from "@/features/crm/organizations/detail/account-notes";
import { LinkParentDialog } from "@/features/crm/organizations/detail/link-parent-dialog";
import { formatCurrency } from "@/lib/format-utils";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip, type IconChipProps } from "@/components/ui/icon-chip";
import { StatsStrip } from "@/components/shared/stats-strip";
import { DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import type { Tone } from "@/lib/design/tones";

const LEAD_STATUS_TONE: Record<string, Tone> = { WON: "success", LOST: "danger" };

function TabCard({ icon, title, children, flush }: { icon: IconChipProps["icon"]; title: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <IconChip icon={icon} tone="neutral" size="sm" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={flush ? "p-0" : "p-5"}>{children}</CardContent>
    </Card>
  );
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  const id = Number(organizationId);

  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const handleOpenParentDialog = useCallback(() => setParentDialogOpen(true), []);
  const handleParentDialogOpenChange = useCallback((open: boolean) => setParentDialogOpen(open), []);

  const { data: org, isLoading: orgLoading } = useCrmOrganizationDetail(id);
  const { data: rollup, isLoading: rollupLoading } = useCrmOrgRollup(id);
  const { data: hierarchy, isLoading: hierarchyLoading } = useCrmOrgHierarchy(id);
  const { data: timeline, isLoading: timelineLoading } = useCrmOrgTimeline(id);
  const { data: relatedLeads, isLoading: leadsLoading } = useCrmOrgRelatedLeads(id);

  if (orgLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Organization" subtitle="Not found">
        <EmptyState
          icon={Building2}
          title="Organization not found."
          action={{ label: "Back to Organizations", href: "/crm/organizations" }}
        />
      </PageWrapper>
    );
  }

  const computedScore = rollup ? computeHealthScore(rollup) : null;
  const displayScore = org.healthScore ?? computedScore;
  const rollupValue = (v: React.ReactNode) => (rollupLoading ? <Skeleton className="h-7 w-12" /> : v);

  return (
    <PageWrapper
      title={org.name}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          {org.industry ?? org.domain ?? "Organization"}
          <AccountHealthBadge healthScore={displayScore} />
        </span>
      }
      actions={
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/organizations">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenParentDialog}>
            <GitBranch className="size-4" />
            {org.parentId ? "Change Parent" : "Link Parent"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <StatsStrip
          items={[
            { label: "Contacts", value: rollupValue(rollup?.totalContacts ?? 0), icon: UserCircle, tone: "info" },
            { label: "Open Deals", value: rollupValue(rollup?.openDeals ?? 0), icon: TrendingUp, tone: "brand" },
            { label: "Total Deal Value", value: rollupValue(rollup ? formatCurrency(rollup.totalDealValue) : ""), icon: BarChart2, tone: "success" },
            { label: "Related Leads", value: rollupValue(rollup?.totalLeads ?? 0), icon: Users, tone: "info" },
          ]}
        />

        <DetailLayout
          rail={
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-xl font-bold text-brand-soft-foreground">
                    {org.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{org.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {org.size && <Badge variant="secondary" className="tabular-nums">{org.size} employees</Badge>}
                      {org.industry && <Badge variant="outline">{org.industry}</Badge>}
                    </div>
                  </div>
                </div>
                <PropertyList
                  items={[
                    { label: "Domain", value: org.domain ? <span className="inline-flex items-center gap-1.5"><Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />{org.domain}</span> : null },
                    {
                      label: "Website",
                      value: org.website ? (
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-text hover:underline">
                          <Link2 className="size-3.5" aria-hidden="true" />Website
                        </a>
                      ) : null,
                    },
                    {
                      label: "LinkedIn",
                      value: org.linkedinUrl ? (
                        <a href={org.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-text hover:underline">
                          <Building2 className="size-3.5" aria-hidden="true" />LinkedIn
                        </a>
                      ) : null,
                    },
                  ]}
                />
                {org.description && (
                  <p className="border-t pt-3 text-sm text-muted-foreground">{org.description}</p>
                )}
              </CardContent>
            </Card>
          }
          main={
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList variant="underline" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="timeline" className="gap-1.5">
              <Clock className="size-3.5" />Timeline
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5">
              <UserCircle className="size-3.5" />Contacts
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <TrendingUp className="size-3.5" />Related Leads
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="gap-1.5">
              <GitBranch className="size-3.5" />Hierarchy
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <FileText className="size-3.5" />Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <TabCard icon={Clock} title="Activity Timeline">
                {timelineLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <AccountTimeline events={timeline ?? []} />
                )}
            </TabCard>
          </TabsContent>

          <TabsContent value="contacts">
            <TabCard icon={UserCircle} title={<>Contacts <span className="tabular-nums text-muted-foreground">({org.contacts?.length ?? 0})</span></>} flush>
                {(org.contacts?.length ?? 0) === 0 ? (
                  <EmptyState compact icon={UserCircle} title="No contacts linked to this organization" className="border-0" />
                ) : (
                  <ul className="divide-y divide-border">
                    {org.contacts?.map((contact) => (
                      <li key={contact.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-xs font-semibold text-neutral-strong">
                          {contact.name[0]?.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[contact.title, contact.department].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {contact.email && (
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}>
                                <Mail className="size-3.5" />
                              </a>
                            </Button>
                          )}
                          {contact.phone && (
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`}>
                                <Phone className="size-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </TabCard>
          </TabsContent>

          <TabsContent value="leads">
            <TabCard icon={TrendingUp} title={<>Related Leads <span className="tabular-nums text-muted-foreground">({leadsLoading ? "..." : (relatedLeads?.length ?? 0)})</span></>} flush>
                {leadsLoading ? (
                  <div className="space-y-2 p-5">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (relatedLeads?.length ?? 0) === 0 ? (
                  <EmptyState compact icon={TrendingUp} title="No leads found for this organization" className="border-0" />
                ) : (
                  <ul className="divide-y divide-border">
                    {relatedLeads?.map((lead) => (
                      <li key={lead.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lead.name ?? "Unnamed Lead"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lead.email ?? lead.phone ?? lead.company ?? "No contact info"}
                          </p>
                        </div>
                        <StatusPill tone={LEAD_STATUS_TONE[lead.status ?? ""] ?? "brand"} dot>
                          {lead.status}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                )}
            </TabCard>
          </TabsContent>

          <TabsContent value="hierarchy">
            <TabCard icon={GitBranch} title="Organizational Hierarchy">
                {hierarchyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                  </div>
                ) : hierarchy ? (
                  <HierarchyTree
                    root={hierarchy}
                    currentId={id}
                    ancestors={[]}
                  />
                ) : (
                  <EmptyState compact icon={GitBranch} title="No hierarchy data available" className="border-0" />
                )}
            </TabCard>
          </TabsContent>

          <TabsContent value="notes">
            <TabCard icon={FileText} title="Account Notes">
                <AccountNotes organizationId={id} initialNotes={org.notes} />
            </TabCard>
          </TabsContent>
        </Tabs>
          }
        />
      </div>

      <LinkParentDialog
        open={parentDialogOpen}
        onOpenChange={handleParentDialogOpenChange}
        organizationId={id}
        currentParentId={org.parentId}
      />
    </PageWrapper>
  );
}
