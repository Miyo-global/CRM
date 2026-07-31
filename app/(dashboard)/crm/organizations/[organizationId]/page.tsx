"use client";

import { useState, use, useCallback, type ElementType } from "react";
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
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ElementType;
  color?: "gold" | "blue" | "green" | "red";
}

function StatCard({ label, value, icon: Icon, color = "gold" }: StatCardProps) {
  const colorMap = {
    gold: "text-gold bg-gold/10",
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-none">{label}</p>
          <p className="text-lg font-semibold leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
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
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Organization" subtitle="Not found">
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Organization not found.</p>
          <Link href="/crm/organizations">
            <Button variant="outline" size="sm" className="mt-4">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Organizations
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const computedScore = rollup ? computeHealthScore(rollup) : null;
  const displayScore = org.healthScore ?? computedScore;

  return (
    <PageWrapper
      title={org.name}
      subtitle={org.industry ?? org.domain ?? "Organization"}
      badge={<AccountHealthBadge healthScore={displayScore} />}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleOpenParentDialog}
          >
            <GitBranch className="h-3.5 w-3.5" />
            {org.parentId ? "Change Parent" : "Link Parent"}
          </Button>
          <Link href="/crm/organizations">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-start">
              <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center text-xl font-bold text-gold shrink-0">
                {org.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap gap-2 items-center">
                  <h2 className="text-base font-semibold">{org.name}</h2>
                  {org.size && <Badge variant="secondary" className="text-xs">{org.size} employees</Badge>}
                  {org.industry && <Badge variant="outline" className="text-xs">{org.industry}</Badge>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {org.domain && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />{org.domain}
                    </span>
                  )}
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gold">
                      <Link2 className="h-3 w-3" />Website
                    </a>
                  )}
                  {org.linkedinUrl && (
                    <a href={org.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gold">
                      <Building2 className="h-3 w-3" />LinkedIn
                    </a>
                  )}
                </div>
                {org.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{org.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Contacts"
            value={rollupLoading ? "..." : (rollup?.totalContacts ?? 0)}
            icon={UserCircle}
            color="blue"
          />
          <StatCard
            label="Open Deals"
            value={rollupLoading ? "..." : (rollup?.openDeals ?? 0)}
            icon={TrendingUp}
            color="gold"
          />
          <StatCard
            label="Total Deal Value"
            value={rollupLoading ? "..." : (rollup ? formatCurrency(rollup.totalDealValue) : "")}
            icon={BarChart2}
            color="green"
          />
          <StatCard
            label="Related Leads"
            value={rollupLoading ? "..." : (rollup?.totalLeads ?? 0)}
            icon={Users}
            color="blue"
          />
        </div>

        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="timeline" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />Timeline
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs gap-1.5">
              <UserCircle className="h-3.5 w-3.5" />UserCircles
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />Related Leads
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="text-xs gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />Hierarchy
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {timelineLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <AccountTimeline events={timeline ?? []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  UserCircles ({org.contacts?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(org.contacts?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCircle className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No contacts linked to this organization</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {org.contacts?.map((contact) => (
                      <li key={contact.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {contact.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[contact.title, contact.department].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-gold">
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-gold">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Related Leads ({leadsLoading ? "..." : (relatedLeads?.length ?? 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {leadsLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (relatedLeads?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No leads found for this organization</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {relatedLeads?.map((lead) => (
                      <li key={lead.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{lead.name ?? "Unnamed Lead"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.email ?? lead.phone ?? lead.company ?? "No contact info"}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              lead.status === "WON" ? "bg-emerald-500/15 text-emerald-400" :
                                lead.status === "LOST" ? "bg-red-500/15 text-red-400" :
                                  "bg-gold/10 text-gold",
                            )}
                          >
                            {lead.status}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Organizational Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
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
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hierarchy data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Account Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <AccountNotes organizationId={id} initialNotes={org.notes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
