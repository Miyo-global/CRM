"use client";

import {
  useOrgMembers,
  useInvitations,
  useInviteUser,
  useCancelInvitation,
  useUpdateMemberRole,
} from "@/lib/api/hooks/organization";
import { useResetMfa, useResendInvitation } from "@/lib/api/hooks/mfa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
import { Search, UserPlus, Shield, ShieldOff, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const ALL_ROLES = [
  { value: "CEO", label: "CEO" },
  { value: "HR", label: "HR" },
  { value: "SALES", label: "Sales" },
  { value: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "DESIGN", label: "Design" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "DIGITAL_MARKETING", label: "Digital Marketing" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "BRANCH_HR", label: "Branch HR" },
];

const ROLE_COLORS: Record<string, string> = {
  CEO: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  HR: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  SALES: "bg-green-500/15 text-green-400 border-green-500/20",
  CUSTOMER_SUPPORT: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ENGINEERING: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  DESIGN: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  VIDEO_EDITOR: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  DIGITAL_MARKETING: "bg-teal-500/15 text-teal-400 border-teal-500/20",
};

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
  const [inviteRole, setInviteRole] = useState<string>("ENGINEERING");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const memberSearch = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const debouncedSearch = useDebouncedValue(memberSearch, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";

  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;
  const canManageMfa = currentUserRole === "CEO" || currentUserRole === "HR";

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
  const resetMfa = useResetMfa();
  const resendInvitation = useResendInvitation();

  const handleInvite = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    inviteUser.mutate(
      { email: inviteEmail, role: inviteRole },
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
    if (currentRole === "CEO" && newRole !== "CEO") {
      const ceoCount = membersData?.data.filter((m) => m.role === "CEO").length ?? 0;
      if (ceoCount <= 1) {
        toast.error("Cannot demote the last remaining CEO");
        return;
      }
    }
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated successfully"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updateRole, currentUserId, membersData]);

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
      subtitle="Manage organization members, roles, and invitations"
      badge={membersData ? String(membersData.pagination.total) : undefined}
      actions={
        <Button onClick={handleToggleInviteForm} className="bg-gold hover:bg-gold/80 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          {showInviteForm ? "Cancel" : "Invite Member"}
        </Button>
      }
    >
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="h-auto w-full sm:w-fit gap-1 rounded-lg p-1">
            <TabsTrigger value="members">
              Members
              {membersData && (
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {membersData.pagination.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations
              {invitations && invitations.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {invitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {showInviteForm && (
              <Card className="rounded-xl border shadow-sm">
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
                        required
                      />
                    </div>
                    <div className="w-full space-y-1.5 sm:w-[180px]">
                      <Label className="text-sm">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.filter(r => r.value !== "CEO").map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-full flex-col justify-end sm:w-auto sm:shrink-0">
                      <Button type="submit" disabled={inviteUser.isPending} className="h-9 w-full sm:w-auto">
                        {inviteUser.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gold" />
                      Organization Members
                      {membersData && <Badge variant="secondary" className="ml-2 text-xs">{membersData.pagination.total}</Badge>}
                    </CardTitle>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search members… (min 3 chars)"
                      value={memberSearch}
                      onChange={handleSearchChange}
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full max-h-[65vh]" type="auto">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="px-5 py-3 text-xs font-semibold">Member</TableHead>
                          <TableHead className="px-5 py-3 text-xs font-semibold">Email</TableHead>
                          <TableHead className="px-5 py-3 text-xs font-semibold">Role</TableHead>
                          <TableHead className="px-5 py-3 text-xs font-semibold">Joined</TableHead>
                          <TableHead className="px-5 py-3 text-right text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membersLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                            <TableCell colSpan={5} className="px-5 py-4">
                                <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : !membersData?.data.length ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                              No members found
                            </TableCell>
                          </TableRow>
                        ) : (
                          membersData.data.map((member) => (
                            <MemberTableRow
                              key={member.userId}
                              member={member}
                              onUpdateRole={handleUpdateRole}
                              onResetMfa={handleResetMfa}
                              canManageMfa={canManageMfa}
                              isResettingMfa={resetMfa.isPending}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
                {membersData && membersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-5 py-3">
                    <span className="text-sm text-muted-foreground">
                      Page {membersData.pagination.page} of {membersData.pagination.totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 text-xs"
                        disabled={page <= 1} onClick={handlePrevPage}>Prev</Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs"
                        disabled={page >= membersData.pagination.totalPages} onClick={handleNextPage}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card className="rounded-xl border shadow-sm">
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
                      required
                    />
                  </div>
                  <div className="w-full space-y-1.5 sm:w-[180px]">
                    <Label className="text-sm">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.filter(r => r.value !== "CEO").map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-full flex-col justify-end sm:w-auto sm:shrink-0">
                    <Button type="submit" disabled={inviteUser.isPending} className="h-9 w-full sm:w-auto">
                      {inviteUser.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Pending Invitations
                  {invitations && invitations.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{invitations.length}</Badge>
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
  };
  onUpdateRole: (userId: string, newRole: string, currentRole: string) => void;
  onResetMfa: (userId: string) => void;
  canManageMfa: boolean;
  isResettingMfa: boolean;
}

function MemberTableRow({ member, onUpdateRole, onResetMfa, canManageMfa, isResettingMfa }: MemberTableRowProps) {
  const handleRoleChange = useCallback((newRole: string) => onUpdateRole(member.userId, newRole, member.role), [member.userId, member.role, onUpdateRole]);
  const handleResetMfa = useCallback(() => onResetMfa(member.userId), [member.userId, onResetMfa]);

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={resolveImageUrl(member.image)} />
            <AvatarFallback className="text-xs bg-gold/10 text-gold">{member.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{member.name || "Unknown"}</span>
            {member.totpEnabled && (
              <Shield className="h-3 w-3 text-green-500" aria-label="MFA enabled" />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">{member.email}</TableCell>
      <TableCell className="px-5 py-3.5">
        <Badge variant="outline" className={`text-[11px] border ${ROLE_COLORS[member.role] || ""}`}>{member.role}</Badge>
      </TableCell>
      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(DEFAULT_LOCALE) : ""}
      </TableCell>
      <TableCell className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canManageMfa && member.totpEnabled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isResettingMfa}
                >
                  <ShieldOff className="h-3 w-3 mr-1" />
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
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleResetMfa}
                  >
                    Reset MFA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Select value={member.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="ml-auto h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="text-sm font-medium">{inv.email}</p>
        <Badge variant="outline" className={`text-[10px] mt-1 ${ROLE_COLORS[inv.role] || ""}`}>{inv.role}</Badge>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleResend}
          disabled={isResending}
          aria-label="Resend invitation"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Resend
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  );
}
