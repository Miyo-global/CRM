"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, CalendarCheck, Users, ListChecks, Clock, Receipt } from "lucide-react";
import Link from "next/link";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  href: string;
}

function getActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
    case "ADMIN":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Add Employee", icon: Users, href: "/hr/onboarding?tab=wizard" },
      ];
    case "HR":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Run Payroll", icon: Receipt, href: "/hr/payroll" },
        { label: "Add Employee", icon: Users, href: "/hr/onboarding?tab=wizard" },
      ];
    case "BRANCH_MANAGER":
    case "BRANCH_HR":
      return [
        { label: "Assign Task", icon: ListChecks, href: "/projects" },
        { label: "Approve Leave", icon: CalendarCheck, href: "/hr/leaves" },
      ];
    default:
      return [
        { label: "Log Time", icon: Clock, href: "/timesheets" },
        { label: "Request Leave", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Log Activity", icon: ListChecks, href: "/crm/activities" },
      ];
  }
}

export function QuickActionsWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const actions = getActionsForRole(role);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0 shrink-0">
        <Zap className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-9 text-sm"
              asChild
            >
              <Link href={action.href} aria-label={action.label}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
