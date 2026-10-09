import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { isAdminOrOwner } from "@/lib/constants/roles";

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

  return (
    <DashboardShell
      userId={session.user.id}
      hasDashboardAccess={hasDashboardAccess}
      defaultCollapsed={defaultCollapsed}
    >
      {children}
    </DashboardShell>
  );
}
