import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { isAdminOrOwner, MANAGEMENT_ROLES, hasRole } from "@/lib/constants/roles";
import { getPendingApprovalCount } from "@/server/actions/leave-actions";
import { SessionProvider } from "@/components/providers/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const role = session.user.role;
  const isAdminRole = isAdminOrOwner(role);
  const hasDashboardAccess = isAdminRole || session.user.hasDashboardAccess !== false;

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  // Prefetch the one number the sidebar needs, for the roles that can see it.
  const pendingLeaveApprovals = hasRole(role, MANAGEMENT_ROLES)
    ? await getPendingApprovalCount()
    : 0;

  return (
    // The session is already resolved here, so hand it to a nested provider:
    // the sidebar and every role-gated page then render on first paint rather
    // than after a client /api/auth/session fetch (A44).
    <SessionProvider session={session}>
      <DashboardShell
        userId={session.user.id}
        hasDashboardAccess={hasDashboardAccess}
        defaultCollapsed={defaultCollapsed}
        pendingLeaveApprovals={pendingLeaveApprovals}
      >
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
