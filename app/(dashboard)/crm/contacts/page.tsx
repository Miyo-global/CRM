"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search, Mail, Phone, Building2,
  ChevronLeft, ChevronRight, Linkedin, MoreHorizontal, Pencil, Trash2,
  TableIcon, LayoutGrid, Link2, Download, Sparkles, Twitter, Globe,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useContacts, useDeleteContact } from "@/lib/api/hooks/crm";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { CreateContactDialog } from "@/features/crm/contacts/create-contact-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import type { LeadEnrichmentResult } from "@/lib/ai/schemas";
import { MinLengthHint } from "@/components/ui/min-length-hint";

const PAGE_SIZE = 20;

function useEnrichContact() {
  return useMutation({
    mutationFn: (input: { name: string; email?: string | null; company?: string | null }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", {
        name: input.name,
        email: input.email ?? undefined,
        company: input.company ?? undefined,
      }),
  });
}

type ContactRow = {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
};

function SocialLinks({ contact }: { contact: ContactRow }) {
  const linkClass = "inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:focus-ring";
  return (
    <div className="flex items-center gap-1">
      {contact.linkedinUrl && (
        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" className={linkClass}>
          <Linkedin className="size-3.5" />
        </a>
      )}
      {contact.twitterUrl && (
        <a href={contact.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter profile" className={linkClass}>
          <Twitter className="size-3.5" />
        </a>
      )}
      {contact.websiteUrl && (
        <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label="Website" className={linkClass}>
          <Globe className="size-3.5" />
        </a>
      )}
    </div>
  );
}

function ContactActions({
  contact,
  enrichPending,
  onView,
  onEnrich,
  onDelete,
  triggerClassName,
}: {
  contact: ContactRow;
  enrichPending: boolean;
  onView: () => void;
  onEnrich: () => void;
  onDelete: () => void;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={triggerClassName} aria-label="More options">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Pencil className="size-3.5" />View / Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/contacts/${contact.id}/vcard`} download>
            <Download className="size-3.5" />Download vCard
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={enrichPending} onClick={onEnrich}>
          <Sparkles className="size-3.5 text-brand-text" />Enrich with AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs tabular-nums text-muted-foreground">Page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteContact = useDeleteContact();
  const enrichContact = useEnrichContact();

  const view = (searchParams.get("view") || "table") as "table" | "card";
  const searchInput = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, error, refetch } = useContacts({
    search: apiSearch || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handleViewTable = useCallback(() => updateParams({ view: null }), [updateParams]);
  const handleViewCard = useCallback(() => updateParams({ view: "card" }), [updateParams]);

  const handleEnrich = useCallback(
    (contact: { id: number; name: string; email: string | null; company: string | null }) => {
      enrichContact.mutate(
        { name: contact.name, email: contact.email, company: contact.company },
        {
          onSuccess: (result) => {
            toast.success(
              `Enriched: ${result.industry} — ${result.estimatedCompanySize}`,
              { description: result.recommendedApproach, duration: 6000 },
            );
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [enrichContact],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteContact.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        setDeleteId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteContact]);

  if (isLoading) {
    return (
      <PageWrapper title="Contacts" subtitle="People directory">
        <div className="space-y-4">
          <Skeleton className="h-9 w-full sm:w-64" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  const items = data?.items ?? [];
  const goToPage = (p: number) => updateParams({ page: p <= 1 ? null : String(p) });
  const actionsFor = (contact: (typeof items)[number], triggerClassName?: string) => (
    <ContactActions
      contact={contact}
      enrichPending={enrichContact.isPending}
      onView={() => router.push(`/crm/contacts/${contact.id}`)}
      onEnrich={() => handleEnrich(contact)}
      onDelete={() => setDeleteId(contact.id)}
      triggerClassName={triggerClassName}
    />
  );
  const emptyState = searchInput ? (
    <EmptyState
      compact={view === "table"}
      illustration={<EmptySearchIllustration className="size-28" />}
      title="No results for these filters"
      action={{ label: "Clear filters", onClick: () => updateParams({ q: null, page: null }) }}
    />
  ) : (
    <EmptyState
      compact={view === "table"}
      illustration={<EmptyTeamIllustration className="size-28" />}
      title="No contacts found"
      description="Create your first contact to get started"
    />
  );

  return (
    <>
      <PageWrapper
        title="Contacts"
        subtitle={`${data?.total ?? 0} contacts`}
        actions={<CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />}
        filters={
          <ListToolbar
            className="w-full"
            filters={
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  data-page-search
                  placeholder="Search contacts"
                  value={searchInput}
                  onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
                  className="pl-9"
                  aria-label="Search contacts"
                  aria-describedby="contacts-search-hint"
                />
                <MinLengthHint id="contacts-search-hint" value={searchInput} />
              </div>
            }
            view={
              <Tabs value={view} onValueChange={(v) => (v === "card" ? handleViewCard() : handleViewTable())}>
                <TabsList>
                  <TabsTrigger value="table" aria-label="Table view">
                    <TableIcon className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger value="card" aria-label="Card view">
                    <LayoutGrid className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
        }
      >
        {isError ? (
          <QueryErrorState title="Couldn't load contacts" error={error} onRetry={() => refetch()} />
        ) : (
        <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">

          {view === "table" && (
            <motion.div variants={fadeUp} className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Social</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableEmpty colSpan={9}>{emptyState}</TableEmpty>
                  ) : items.map(contact => (
                    <TableRow key={contact.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-3xs font-bold text-brand-soft-foreground">
                            {contact.name[0]?.toUpperCase() ?? "?"}
                          </span>
                          <span className="max-w-36 truncate font-medium" title={contact.name}>{contact.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">{contact.email || ""}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{contact.phone || ""}</TableCell>
                      <TableCell className="max-w-32 truncate text-muted-foreground">{contact.company || ""}</TableCell>
                      <TableCell className="max-w-32 truncate text-muted-foreground">{contact.title || ""}</TableCell>
                      <TableCell>
                        {contact.tags && (contact.tags as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(contact.tags as string[]).slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><SocialLinks contact={contact} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {contact.lead && (
                            <Link href={`/crm/leads/${contact.lead.id}`} className="inline-flex max-w-32 items-center gap-1 truncate text-xs font-medium text-info-strong hover:underline">
                              <Link2 className="size-3 shrink-0" aria-hidden="true" />Lead: {contact.lead.name}
                            </Link>
                          )}
                          {contact.deal && (
                            <Link href={`/crm/deals/${contact.deal.id}`} className="inline-flex max-w-32 items-center gap-1 truncate text-xs font-medium text-brand-text hover:underline">
                              <Link2 className="size-3 shrink-0" aria-hidden="true" />Deal: {contact.deal.name}
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {actionsFor(contact, "pointer-coarse:opacity-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager page={page} totalPages={totalPages} onPage={goToPage} />
            </motion.div>
          )}

          {view === "card" && (
            items.length === 0 ? (
              emptyState
            ) : (
            <>
              <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map(contact => (
                  <Card key={contact.id} className="group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand-soft-foreground">
                          {contact.name[0]?.toUpperCase() ?? "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" title={contact.name}>{contact.name}</p>
                          {contact.title && <p className="truncate text-xs text-muted-foreground">{contact.title}</p>}
                        </div>
                        {actionsFor(contact, "shrink-0 pointer-coarse:opacity-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100")}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="tabular-nums">{contact.phone}</span>
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                      </div>
                      {(contact.linkedinUrl || contact.twitterUrl || contact.websiteUrl) && (
                        <div className="mt-3"><SocialLinks contact={contact} /></div>
                      )}
                      {(contact.tags as string[]).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(contact.tags as string[]).slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      {(contact.lead || contact.deal) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {contact.lead && (
                            <Link href={`/crm/leads/${contact.lead.id}`} className="rounded-full focus-visible:focus-ring">
                              <Badge variant="info" className="cursor-pointer">
                                <Link2 aria-hidden="true" />Lead: {contact.lead.name}
                              </Badge>
                            </Link>
                          )}
                          {contact.deal && (
                            <Link href={`/crm/deals/${contact.deal.id}`} className="rounded-full focus-visible:focus-ring">
                              <Badge variant="warning" className="cursor-pointer">
                                <Link2 aria-hidden="true" />Deal: {contact.deal.name}
                              </Badge>
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              <Pager page={page} totalPages={totalPages} onPage={goToPage} />
            </>
            )
          )}
        </motion.div>
        )}
      </PageWrapper>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The contact will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
