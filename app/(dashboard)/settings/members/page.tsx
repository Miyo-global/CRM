"use client";

import {
  useOrgMembers,
  useInvitations,
  useInviteUser,
  useCancelInvitation,
  useUpdateMemberRole,
  useSetPortalAccess,
  useResendInvitation,
} from "@/lib/api/hooks/organization";
import { useRolesList } from "@/lib/api/hooks/roles";
import { EMAIL_ADDRESS_SCHEMA, EMAIL_MAX_LENGTH } from "@/lib/utils/email-validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, UserPlus, Shield, ShieldOff, RefreshCw, Users, Mail, MoreHorizontal, UserX, LogIn, Copy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { MinLengthHint } from "@/components/ui/min-length-hint";
import { ASSIGNABLE_ROLE_OPTIONS, getRoleLabel, isSystemRole } from "@/lib/rbac/roles";
import { canChangeRoleOf, canGrantRole } from "@/lib/auth/role-change-rules";

type RoleOption = { value: string; label: string };

/**
 * QA-ROLE-02: invite, and the role control on a member row, offer the same
 * list — the assignable system roles plus the org's custom roles. Admin-level
 * roles appear only for the Super Admin, the one person who may grant them.
 */
function useAssignableRoleOptions(actorRole: string | undefined): RoleOption[] {
  const { data: orgRoles } = useRolesList();
  const custom = (orgRoles ?? [])
    .filter((role) => !isSystemRole(role.slug))
    .map((role) => ({ value: role.slug, label: role.name }));
  return [...ASSIGNABLE_ROLE_OPTIONS, ...custom].filter((option) => canGrantRole(actorRole, option.value));
}

const countPill = "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-soft px-1.5 text-2xs font-semibold tabular-nums text-neutral-strong";

export default function MembersSettingsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <MembersSettingsContent />
    </DashboardGate>
  );
}

function MembersSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("EMPLOYEE");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const memberSearch = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const debouncedSearch = useDebouncedValue(memberSearch, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";

  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;
  const roleOptions = useAssignableRoleOptions(currentUserRole);

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

  const { data: membersData, isLoading: membersLoading } = useOrgMembers(
    page,
    20,
    apiSearch || undefined
  );
  const { data: invitations } = useInvitations();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const updateRole = useUpdateMemberRole();
  const setPortalAccess = useSetPortalAccess();
  const resendInvitation = useResendInvitation();

  const handleInvite = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // `required` alone did nothing here: the browser skips it on a form
    // submitted from a button inside a card, so an empty invite was a silent
    // no-op (QA-0069).
    if (!inviteEmail.trim()) {
      setInviteError("Enter the email address to invite.");
      return;
    }
    // Same rule as the API (R3-INV-10): domain + TLD, 254 total, 64 before @.
    const parsed = EMAIL_ADDRESS_SCHEMA.safeParse(inviteEmail);
    if (!parsed.success) {
      setInviteError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    const email = parsed.data;
    setInviteError(null);
    inviteUser.mutate(
      { email, role: inviteRole },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${email} as ${getRoleLabel(inviteRole)}`);
          setInviteEmail("");
          setShowInviteForm(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [inviteUser, inviteEmail, inviteRole]);

  const [cancelTarget, setCancelTarget] = useState<{ id: string; email: string } | null>(null);
  const handleCancelInvitation = useCallback((invitationId: string) => {
    const inv = invitations?.find((i) => i.id === invitationId);
    setCancelTarget({ id: invitationId, email: inv?.email ?? "this address" });
  }, [invitations]);
  const confirmCancelInvitation = useCallback(() => {
    if (!cancelTarget) return;
    const { id, email } = cancelTarget;
    setCancelTarget(null);
    cancelInvitation.mutate(
      { invitationId: id },
      {
        onSuccess: () => toast.success(`Invitation to ${email} cancelled`),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [cancelInvitation, cancelTarget]);

  // Only the token hash is stored, so copying mints a fresh link (R3-INV-12).
  const handleCopyInviteLink = useCallback((invitationId: string) => {
    resendInvitation.mutate(
      { invitationId, deliver: "link" },
      {
        onSuccess: async (res) => {
          if (!res.url) return;
          try {
            await navigator.clipboard.writeText(res.url);
            toast.success("Invitation link copied. The link in the earlier email no longer works.");
          } catch {
            toast.error("Could not copy the link. Use Resend to email it instead.");
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [resendInvitation]);

  const handleResendInvitation = useCallback((invitationId: string) => {
    resendInvitation.mutate(
      { invitationId },
      {
        onSuccess: () => toast.success("Invitation resent"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [resendInvitation]);

  const handleUpdateRole = useCallback((userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    if (userId === currentUserId) {
      toast.error("You cannot change your own role");
      return;
    }
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated successfully"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updateRole, currentUserId]);

  const handlePortalAccess = useCallback((userId: string, enabled: boolean) => {
    setPortalAccess.mutate(
      { userId, enabled },
      {
        onSuccess: () => toast.success(enabled ? "Portal access restored" : "Portal access switched off"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [setPortalAccess]);

  const handleToggleInviteForm = useCallback(() => setShowInviteForm((v) => !v), []);
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setInviteEmail(e.target.value); setInviteError(null); }, []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateParams({ q: e.target.value || null, page: null });
  }, [updateParams]);
  const handlePrevPage = useCallback(() => updateParams({ page: page <= 2 ? null : String(page - 1) }), [page, updateParams]);
  const handleNextPage = useCallback(() => updateParams({ page: String(page + 1) }), [page, updateParams]);

  return (
    <PageWrapper
      title="Members"
      badge={membersData ? String(membersData.pagination.total) : undefined}
      actions={
        <Button onClick={handleToggleInviteForm} variant={showInviteForm ? "outline" : "default"}>
          <UserPlus aria-hidden />
          {showInviteForm ? "Cancel" : "Invite Member"}
        </Button>
      }
    >
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList variant="underline">
            <TabsTrigger value="members">
              Members
              {membersData && (
                <span className={countPill}>{membersData.pagination.total}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations
              {invitations && invitations.length > 0 && (
                <span className={countPill}>{invitations.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {showInviteForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invite New Member</CardTitle>
                  <CardDescription>Send an invitation to join your organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={handleEmailChange}
                      maxLength={EMAIL_MAX_LENGTH}
                        aria-invalid={inviteError ? true : undefined}
                        aria-describedby={inviteError ? "email-error" : undefined}
                        required
                      />
                      {inviteError && (
                        <p id="email-error" role="alert" className="text-xs text-danger-strong">
                          {inviteError}
                        </p>
                      )}
                    </div>
                    <div className="w-full space-y-1.5 sm:w-44">
                      <Label className="text-sm">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-full flex-col justify-end sm:w-auto sm:shrink-0">
                      <Button
                      type="submit"
                      disabled={inviteUser.isPending || inviteEmail.trim().length === 0}
                      loading={inviteUser.isPending}
                      className="w-full sm:w-auto"
                    >
                        {inviteUser.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="size-4 text-brand-text" aria-hidden />
                      Organization Members
                      {membersData && <span className={countPill}>{membersData.pagination.total}</span>}
                    </CardTitle>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" aria-hidden />
                    <Input
                      placeholder="Search members"
                      value={memberSearch}
                      onChange={handleSearchChange}
                      className="pl-8"
                      data-page-search
                      aria-label="Search members"
                      aria-describedby="members-search-hint"
                    />
                    <MinLengthHint id="members-search-hint" value={memberSearch} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="border-t border-border p-0">
                    {/* The card clipped a table wider than it, cutting off the
                        last columns with no way to reach them (QA-D008). */}
                    <div className="overflow-x-auto">
                    {/* No forced min width: under md the email moves under the name and
                        Joined drops, so Role and Actions fit; Actions stay pinned (R3-RSP-02). */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-5">Member</TableHead>
                          <TableHead hideBelow="md" className="px-5">Email</TableHead>
                          <TableHead className="px-5">Role</TableHead>
                          <TableHead hideBelow="sm" className="px-5">Joined</TableHead>
                          <TableHead pinned="right" className="px-5 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membersLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={5} className="px-5 py-3">
                                <Skeleton className="h-9 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : !membersData?.data.length ? (
                          <TableEmpty
                            colSpan={5}
                            icon={memberSearch ? Search : Users}
                            message={memberSearch ? "No results for these filters" : "No members found"}
                          />
                        ) : (
                          membersData.data.map((member) => (
                            <MemberTableRow
                              key={member.userId}
                              member={member}
                              onUpdateRole={handleUpdateRole}
                              onPortalAccess={handlePortalAccess}
                              actor={{ userId: currentUserId, role: currentUserRole }}
                              roleOptions={roleOptions}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                    </div>
                {membersData && membersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      Page {membersData.pagination.page} of {membersData.pagination.totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm"
                        disabled={page <= 1} onClick={handlePrevPage}>Prev</Button>
                      <Button variant="outline" size="sm"
                        disabled={page >= membersData.pagination.totalPages} onClick={handleNextPage}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite New Member</CardTitle>
                <CardDescription>Send an invitation to join your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="inv-tab-email" className="text-sm">Email</Label>
                    <Input
                      id="inv-tab-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={handleEmailChange}
                      maxLength={EMAIL_MAX_LENGTH}
                      aria-invalid={inviteError ? true : undefined}
                      aria-describedby={inviteError ? "inv-tab-email-error" : undefined}
                      required
                    />
                    {inviteError && (
                      <p id="inv-tab-email-error" role="alert" className="text-xs text-danger-strong">
                        {inviteError}
                      </p>
                    )}
                  </div>
                  <div className="w-full space-y-1.5 sm:w-44">
                    <Label className="text-sm">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-full flex-col justify-end sm:w-auto sm:shrink-0">
                    <Button
                      type="submit"
                      disabled={inviteUser.isPending || inviteEmail.trim().length === 0}
                      loading={inviteUser.isPending}
                      className="w-full sm:w-auto"
                    >
                      {inviteUser.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Pending Invitations
                  {invitations && invitations.length > 0 && (
                    <span className={countPill}>{invitations.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitations && invitations.length > 0 ? (
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <InvitationRow
                        key={inv.id}
                        inv={inv}
                        onCancel={handleCancelInvitation}
                        onResend={handleResendInvitation}
                        onCopyLink={handleCopyInviteLink}
                        isResending={resendInvitation.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={Mail}
                    title="No pending invitations"
                    description="Invitations you send will appear here until they're accepted."
                    className="border-0 bg-transparent"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <ConfirmDialog
          open={!!cancelTarget}
          onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
          title="Cancel invitation"
          description={`The invitation to ${cancelTarget?.email ?? "this address"} will stop working. You can invite them again later.`}
          confirmLabel="Cancel invitation"
          cancelLabel="Keep invitation"
          destructive
          onConfirm={confirmCancelInvitation}
        />
    </PageWrapper>
  );
}

interface MemberTableRowProps {
  member: {
    userId: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: string;
    joinedAt?: string | Date | null;
    hasDashboardAccess?: boolean;
    isActive?: boolean | null;
  };
  actor: { userId: string | undefined; role: string | undefined };
  roleOptions: RoleOption[];
  onUpdateRole: (userId: string, newRole: string, currentRole: string) => void;
  onPortalAccess: (userId: string, enabled: boolean) => void;
}

function MemberTableRow({ member, actor, roleOptions, onUpdateRole, onPortalAccess }: MemberTableRowProps) {
  const handleRoleChange = useCallback((newRole: string) => onUpdateRole(member.userId, newRole, member.role), [member.userId, member.role, onUpdateRole]);
  const portalOn = member.hasDashboardAccess !== false;
  const handlePortalAccess = useCallback(() => onPortalAccess(member.userId, !portalOn), [member.userId, portalOn, onPortalAccess]);

  // QA-AUTH-01: no role control on the Super Admin's row, on your own row, or
  // on an Admin-level row unless you are the Super Admin. The server applies
  // the same rule.
  // R3-SA-07: a terminated / deactivated account is flagged and read-only;
  // the server refuses a role change for it too.
  const isTerminated = member.isActive === false;
  const canChangeRole = !isTerminated && canChangeRoleOf(actor, { userId: member.userId, role: member.role });
  // QA-BUG-37: the same people can switch off portal access or start the
  // termination workflow — never for the owner, never for yourself.
  const canManageMember = !isTerminated && (canChangeRole || (actor.role === "CEO" && member.userId !== actor.userId));
  const currentRoleListed = roleOptions.some((r) => r.value === member.role);
  // R2-LC-14: where the actor may not change this role, the control stays
  // visible but disabled and says who can.
  const lockedReason = !canChangeRole && actor.userId && member.userId !== actor.userId
    ? isTerminated
      ? "This account is terminated or inactive. Its role cannot be changed."
      : member.role === "CEO"
      ? "The Super Admin's role cannot be changed."
      : "Only the Super Admin can change Admin and HR roles."
    : null;

  return (
    <TableRow>
      <TableCell className="px-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={resolveImageUrl(member.image)} />
            <AvatarFallback className="text-xs bg-brand-soft text-brand-text">{member.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="block text-sm font-medium">{member.name || "Unknown"}</span>
            <span className="block max-w-44 truncate text-xs text-muted-foreground md:hidden" title={member.email}>{member.email}</span>
          </div>
        </div>
      </TableCell>
      <TableCell hideBelow="md" className="max-w-64 truncate px-5 text-sm text-muted-foreground" title={member.email}>{member.email}</TableCell>
      <TableCell className="px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone="neutral">{getRoleLabel(member.role)}</StatusPill>
          {isTerminated && <StatusPill tone="danger">Terminated</StatusPill>}
        </div>
      </TableCell>
      <TableCell hideBelow="sm" className="px-5 text-sm text-muted-foreground tabular-nums">
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(DEFAULT_LOCALE) : ""}
      </TableCell>
      <TableCell pinned="right" className="px-5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canChangeRole && (
            <Select value={member.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="ml-auto h-8 w-32 text-xs sm:w-40" aria-label={`Role for ${member.name || member.email}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {!currentRoleListed && (
                  <SelectItem value={member.role} className="text-xs" disabled>{getRoleLabel(member.role)}</SelectItem>
                )}
                {roleOptions.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {lockedReason && (
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="ml-auto rounded-md focus-visible:focus-ring">
                  <Select value={member.role} disabled>
                    <SelectTrigger className="h-8 w-32 text-xs sm:w-40" aria-label={`Role for ${member.name || member.email}: ${lockedReason}`}>
                      <SelectValue>{getRoleLabel(member.role)}</SelectValue>
                    </SelectTrigger>
                  </Select>
                </span>
              </TooltipTrigger>
              <TooltipContent>{lockedReason}</TooltipContent>
            </Tooltip>
            </TooltipProvider>
          )}
          {canManageMember && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${member.name || member.email}`}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePortalAccess}>
                  {portalOn ? <ShieldOff aria-hidden /> : <LogIn aria-hidden />}
                  {portalOn ? "Switch off portal access" : "Restore portal access"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild variant="destructive">
                  <Link href={`/hr/termination?employee=${encodeURIComponent(member.userId)}`}>
                    <UserX aria-hidden />
                    Start termination
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface InvitationRowProps {
  inv: { id: string; email: string; role: string };
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
  onCopyLink: (id: string) => void;
  isResending: boolean;
}

function InvitationRow({ inv, onCancel, onResend, onCopyLink, isResending }: InvitationRowProps) {
  const handleCancel = useCallback(() => onCancel(inv.id), [inv.id, onCancel]);
  const handleResend = useCallback(() => onResend(inv.id), [inv.id, onResend]);
  const handleCopy = useCallback(() => onCopyLink(inv.id), [inv.id, onCopyLink]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{inv.email}</p>
        <StatusPill tone="neutral" className="mt-1">{getRoleLabel(inv.role)}</StatusPill>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isResending}
          aria-label="Resend invitation"
        >
          <RefreshCw aria-hidden />
          Resend
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isResending} aria-label={`Copy invitation link for ${inv.email}`}>
          <Copy aria-hidden />
          Copy link
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  );
}
