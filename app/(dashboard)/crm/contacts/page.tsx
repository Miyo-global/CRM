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
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useContacts, useDeleteContact } from "@/lib/api/hooks/crm";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { CreateContactDialog } from "@/features/crm/contacts/create-contact-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import type { LeadEnrichmentResult } from "@/lib/ai/schemas";

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

  const { data, isLoading } = useContacts({
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
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-96" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Contacts"
        subtitle={`${data?.total ?? 0} contacts`}
        actions={
          <>
            <div className="flex items-center border border-border rounded-md">
              <Button variant={view === "table" ? "default" : "ghost"} size="sm"
                className={cn("rounded-r-none", view === "table" && "bg-gold hover:bg-gold/90 text-white")}
                onClick={handleViewTable}>
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button variant={view === "card" ? "default" : "ghost"} size="sm"
                className={cn("rounded-l-none", view === "card" && "bg-gold hover:bg-gold/90 text-white")}
                onClick={handleViewCard}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
          </>
        }
        filters={
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts (min 3 chars)..."
              value={searchInput}
              onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
              className="pl-8 h-8 text-xs"
            />
          </div>
        }
      >
        <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">

          {view === "table" && (
            <motion.div variants={fadeUp}>
              <div className="border border-border rounded-md flex flex-col h-[calc(100dvh-16rem)] min-h-[320px]">
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="min-w-max">
                    <table className="w-full caption-bottom text-[11px]">
                      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <TableRow className="border-b-2 border-border">
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Email</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Phone</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Company</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Title</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Tags</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Social</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Linked To</TableHead>
                          <TableHead className="text-[10px] w-8 px-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.items ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                              <EmptyTeamIllustration className="mx-auto mb-3 w-24 h-24" />
                              <p className="text-sm font-medium text-foreground">No contacts found</p>
                              <p className="text-xs mt-1">Create your first contact to get started</p>
                            </TableCell>
                          </TableRow>
                        ) : data?.items.map(contact => (
                          <TableRow key={contact.id} className="h-8 hover:bg-muted/30 transition-colors">
                            <TableCell className="px-2 py-1">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-[9px] font-bold text-gold shrink-0">
                                  {contact.name[0]?.toUpperCase() ?? "?"}
                                </div>
                                <span className="text-[12px] font-medium truncate max-w-[120px]">{contact.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground px-2 py-1 truncate max-w-[140px]">{contact.email || ""}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground font-mono px-2 py-1">{contact.phone || ""}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground px-2 py-1 truncate max-w-[100px]">{contact.company || ""}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground px-2 py-1 truncate max-w-[100px]">{contact.title || ""}</TableCell>
                            <TableCell className="px-2 py-1">
                              {contact.tags && (contact.tags as string[]).length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {(contact.tags as string[]).slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[8px] px-1 py-0 h-4">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <div className="flex items-center gap-1.5">
                                {contact.linkedinUrl && (
                                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                    aria-label="LinkedIn profile" className="text-muted-foreground hover:text-blue-500 transition-colors">
                                    <Linkedin className="h-3 w-3" />
                                  </a>
                                )}
                                {contact.twitterUrl && (
                                  <a href={contact.twitterUrl} target="_blank" rel="noopener noreferrer"
                                    aria-label="Twitter profile" className="text-muted-foreground hover:text-sky-500 transition-colors">
                                    <Twitter className="h-3 w-3" />
                                  </a>
                                )}
                                {contact.websiteUrl && (
                                  <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer"
                                    aria-label="Website" className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Globe className="h-3 w-3" />
                                  </a>
                                )}
                                {!contact.linkedinUrl && !contact.twitterUrl && !contact.websiteUrl && (
                                  null
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <div className="flex flex-col gap-0.5">
                                {contact.lead && (
                                  <Link href={`/crm/leads/${contact.lead.id}`} className="inline-flex items-center gap-1 text-[9px] font-medium text-blue-600 hover:text-blue-700 hover:underline truncate max-w-[90px]">
                                    <Link2 className="h-2.5 w-2.5 shrink-0" />Lead: {contact.lead.name}
                                  </Link>
                                )}
                                {contact.deal && (
                                  <Link href={`/crm/deals/${contact.deal.id}`} className="inline-flex items-center gap-1 text-[9px] font-medium text-gold hover:text-gold/80 hover:underline truncate max-w-[90px]">
                                    <Link2 className="h-2.5 w-2.5 shrink-0" />Deal: {contact.deal.name}
                                  </Link>
                                )}
                                {!contact.lead && !contact.deal && null}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/crm/contacts/${contact.id}`)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />View / Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <a href={`/api/contacts/${contact.id}/vcard`} download>
                                      <Download className="h-3.5 w-3.5 mr-2" />Download vCard
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={enrichContact.isPending}
                                    onClick={() => handleEnrich(contact)}
                                  >
                                    <Sparkles className="h-3.5 w-3.5 mr-2 text-gold" />Enrich with AI
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => setDeleteId(contact.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </table>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="shrink-0 flex items-center justify-between p-4 border-t">
                    <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages}
                        onClick={() => updateParams({ page: String(page + 1) })}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === "card" && (
            <>
              <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data?.items.map(contact => (
                  <Card key={contact.id} className="shadow-sm hover:shadow-md transition-all hover:border-gold/40 group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center text-sm font-semibold text-gold shrink-0">
                          {contact.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-gold transition-colors">{contact.name}</p>
                          {contact.title && <p className="text-xs text-muted-foreground truncate">{contact.title}</p>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="More options">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/crm/contacts/${contact.id}`)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />View / Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/api/contacts/${contact.id}/vcard`} download>
                                <Download className="h-3.5 w-3.5 mr-2" />Download vCard
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={enrichContact.isPending}
                              onClick={() => handleEnrich(contact)}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-2 text-gold" />Enrich with AI
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(contact.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                      </div>
                      {(contact.linkedinUrl || contact.twitterUrl || contact.websiteUrl) && (
                        <div className="mt-3 flex items-center gap-2">
                          {contact.linkedinUrl && (
                            <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                              aria-label="LinkedIn profile" className="text-muted-foreground hover:text-blue-500 transition-colors">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.twitterUrl && (
                            <a href={contact.twitterUrl} target="_blank" rel="noopener noreferrer"
                              aria-label="Twitter profile" className="text-muted-foreground hover:text-sky-500 transition-colors">
                              <Twitter className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.websiteUrl && (
                            <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer"
                              aria-label="Website" className="text-muted-foreground hover:text-foreground transition-colors">
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                      {(contact.tags as string[]).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(contact.tags as string[]).slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      {(contact.lead || contact.deal) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {contact.lead && (
                            <Link href={`/crm/leads/${contact.lead.id}`}>
                              <Badge variant="secondary" className="text-[10px] text-blue-600 border-blue-200 hover:border-blue-400 gap-1 cursor-pointer">
                                <Link2 className="h-2.5 w-2.5" />Lead: {contact.lead.name}
                              </Badge>
                            </Link>
                          )}
                          {contact.deal && (
                            <Link href={`/crm/deals/${contact.deal.id}`}>
                              <Badge variant="secondary" className="text-[10px] text-amber-700 border-amber-200 hover:border-amber-400 gap-1 cursor-pointer">
                                <Link2 className="h-2.5 w-2.5" />Deal: {contact.deal.name}
                              </Badge>
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              {(data?.items.length ?? 0) === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <EmptyTeamIllustration className="mx-auto mb-3 w-36 h-36" />
                  <p className="text-sm font-medium text-foreground">No contacts found</p>
                  <p className="text-xs mt-1">Create your first contact to get started</p>
                </div>
              )}

              {totalPages > 1 && (
                <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1}
                    onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages}
                    onClick={() => updateParams({ page: String(page + 1) })}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
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
