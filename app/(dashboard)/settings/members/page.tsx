"use client";

import {
  useOrgMembers,
  useInvitations,
  useInviteUser,
  useCancelInvitation,
  useUpdateMemberRole,
  useSetPortalAccess,
} from "@/lib/api/hooks/organization";
import { useRolesList } from "@/lib/api/hooks/roles";
import { useResetMfa, useResendInvitation } from "@/lib/api/hooks/mfa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, UserPlus, Shield, ShieldOff, RefreshCw, Users, Mail, MoreHorizontal, UserX, LogIn } from "lucide-react";
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
import { canChangeRoleOf } from "@/lib/auth/role-change-rules";

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
  const system = ASSIGNABLE_ROLE_OPTIONS.filter(
    (option) => actorRole === "CEO" || (option.value !== "ADMIN" && option.value !== "HR"),
  );
  return [...system, ...custom];
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
  const canManageMfa = currentUserRole === "CEO" || currentUserRole === "HR";
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
  const resetMfa = useResetMfa();
  const resendInvitation = useResendInvitation();

  const handleInvite = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // `required` alone did nothing here: the browser skips it on a form
    // submitted from a button inside a card, so an empty invite was a silent
    // no-op (QA-0069).
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Enter the email address to invite.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    setInviteError(null);
    inviteUser.mutate(
      { email, role: inviteRole },
      {
        onSuccess: () => {
          toast.success("Invitation sent!");
          setInviteEmail("");
          setShowInviteForm(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [inviteUser, inviteEmail, inviteRole]);

  const handleCancelInvitation = useCallback((invitationId: string) => {
    cancelInvitation.mutate(
      { invitationId },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [cancelInvitation]);

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

  const handleResetMfa = useCallback((userId: string) => {
    resetMfa.mutate(
      { userId },
      {
        onSuccess: () => toast.success("MFA reset successfully"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [resetMfa]);

  const handleToggleInviteForm = useCallback(() => setShowInviteForm((v) => !v), []);
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value), []);
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
                  <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={handleEmailChange}
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
                    <Table className="min-w-225">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-5">Member</TableHead>
                          <TableHead className="px-5">Email</TableHead>
                          <TableHead className="px-5">Role</TableHead>
                          <TableHead className="px-5">Joined</TableHead>
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
                              onResetMfa={handleResetMfa}
                              canManageMfa={canManageMfa}
                              isResettingMfa={resetMfa.isPending}
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
                <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="inv-tab-email" className="text-sm">Email</Label>
                    <Input
                      id="inv-tab-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={handleEmailChange}
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
    totpEnabled?: boolean;
    hasDashboardAccess?: boolean;
  };
  actor: { userId: string | undefined; role: string | undefined };
  roleOptions: RoleOption[];
  onUpdateRole: (userId: string, newRole: string, currentRole: string) => void;
  onPortalAccess: (userId: string, enabled: boolean) => void;
  onResetMfa: (userId: string) => void;
  canManageMfa: boolean;
  isResettingMfa: boolean;
}

function MemberTableRow({ member, actor, roleOptions, onUpdateRole, onPortalAccess, onResetMfa, canManageMfa, isResettingMfa }: MemberTableRowProps) {
  const handleRoleChange = useCallback((newRole: string) => onUpdateRole(member.userId, newRole, member.role), [member.userId, member.role, onUpdateRole]);
  const handleResetMfa = useCallback(() => onResetMfa(member.userId), [member.userId, onResetMfa]);
  const portalOn = member.hasDashboardAccess !== false;
  const handlePortalAccess = useCallback(() => onPortalAccess(member.userId, !portalOn), [member.userId, portalOn, onPortalAccess]);

  // QA-AUTH-01: no role control on the Super Admin's row, on your own row, or
  // on an Admin-level row unless you are the Super Admin. The server applies
  // the same rule.
  const canChangeRole = canChangeRoleOf(actor, { userId: member.userId, role: member.role });
  // QA-BUG-37: the same people can switch off portal access or start the
  // termination workflow — never for the owner, never for yourself.
  const canManageMember = canChangeRole || (actor.role === "CEO" && member.userId !== actor.userId);
  const currentRoleListed = roleOptions.some((r) => r.value === member.role);

  return (
    <TableRow>
      <TableCell className="px-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={resolveImageUrl(member.image)} />
            <AvatarFallback className="text-xs bg-brand-soft text-brand-text">{member.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{member.name || "Unknown"}</span>
            {member.totpEnabled && (
              <Shield className="size-3.5 text-success-strong" aria-label="MFA enabled" />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-64 truncate px-5 text-sm text-muted-foreground" title={member.email}>{member.email}</TableCell>
      <TableCell className="px-5">
        <StatusPill tone="neutral">{getRoleLabel(member.role)}</StatusPill>
      </TableCell>
      <TableCell className="px-5 text-sm text-muted-foreground tabular-nums">
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(DEFAULT_LOCALE) : ""}
      </TableCell>
      <TableCell pinned="right" className="px-5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canManageMfa && member.totpEnabled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-danger-soft"
                  disabled={isResettingMfa}
                >
                  <ShieldOff aria-hidden />
                  Reset MFA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset MFA for {member.name || member.email}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disable two-factor authentication for this user. They will need to re-enable it to regain MFA protection.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    onClick={handleResetMfa}
                  >
                    Reset MFA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canChangeRole && (
            <Select value={member.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="ml-auto h-8 w-40 text-xs" aria-label={`Role for ${member.name || member.email}`}><SelectValue /></SelectTrigger>
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
  isResending: boolean;
}

function InvitationRow({ inv, onCancel, onResend, isResending }: InvitationRowProps) {
  const handleCancel = useCallback(() => onCancel(inv.id), [inv.id, onCancel]);
  const handleResend = useCallback(() => onResend(inv.id), [inv.id, onResend]);

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
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  );
}
