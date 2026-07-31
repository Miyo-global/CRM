"use client";

import { useMemo } from "react";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Users, Network, Building2 } from "lucide-react";
import type { Employee } from "@/types/hr";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { getRoleLabel, isSystemRole } from "@/lib/rbac/roles";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

const ROLE_DOT: Record<string, string> = {
  CEO: "bg-amber-500",
  HR: "bg-purple-500",
  ADMIN: "bg-blue-500",
};

function canonicalRole(role: string | null | undefined): string {
  if (!role || !role.trim()) return "OTHER";
  // Collapse any run of non-alphanumeric chars (spaces, hyphens, slashes, dots,
  // repeated separators) to a single underscore so casing/spacing/punctuation
  // variants group together — e.g. "Digital MArketiNG", "digital-marketing",
  // and "Digital_Marketing" all canonicalize to DIGITAL_MARKETING.
  const canon = role
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return canon || "OTHER";
}

function roleDisplay(role: string | null | undefined): string {
  const c = canonicalRole(role);
  if (isSystemRole(c)) return getRoleLabel(c);
  return c
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0] + w.slice(1).toLowerCase()))
    .join(" ");
}

function displayName(emp: Employee): string {
  if (emp.name?.trim()) return emp.name.trim();
  const full = [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim();
  return full || emp.email || "Unnamed";
}

function initials(emp: Employee): string {
  const first = emp.firstName?.trim();
  const last = emp.lastName?.trim();
  if (first && last) return (first[0]! + last[0]!).toUpperCase();
  if (first) return first.substring(0, 2).toUpperCase();
  const n = emp.name?.trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  return parts.length > 1
    ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
    : n.substring(0, 2).toUpperCase();
}

function dedupeEmployees(employees: Employee[]): Employee[] {
  const seen = new Set<string>();
  const out: Employee[] = [];
  for (const e of employees) {
    const key = e.id?.trim() || (e.email ? `email:${e.email.trim().toLowerCase()}` : `name:${(e.name ?? "").trim()}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function buildTree(employees: Employee[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] });
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.reportingTo && map.has(emp.reportingTo) && emp.reportingTo !== emp.id) {
      map.get(emp.reportingTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectAndBreakCycles(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    const node = map.get(nodeId);
    if (node) {
      node.children = node.children.filter((child) => {
        const isCycle = detectAndBreakCycles(child.employee.id);
        if (isCycle) {
          roots.push(child);
          return false;
        }
        return true;
      });
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const root of [...roots]) {
    detectAndBreakCycles(root.employee.id);
  }

  const priority: Record<string, number> = { CEO: 0, ADMIN: 1, HR: 2 };
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      const pa = priority[canonicalRole(a.employee.role)] ?? 99;
      const pb = priority[canonicalRole(b.employee.role)] ?? 99;
      return pa !== pb ? pa - pb : displayName(a.employee).localeCompare(displayName(b.employee));
    });
    nodes.forEach((n) => sortNodes(n.children));
  }
  sortNodes(roots);
  return roots;
}

function PersonCard({ emp, size = "md" }: { emp: Employee; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-lg border bg-card p-2.5 hover:shadow-sm transition-shadow",
      isSm ? "min-w-[160px]" : "min-w-[200px]"
    )}>
      <Avatar className={isSm ? "h-8 w-8" : "h-9 w-9"}>
        <AvatarImage src={resolveImageUrl(emp.image)} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials(emp)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p
          className={cn("font-medium truncate", isSm ? "text-xs" : "text-sm")}
          title={emp.email ? `${displayName(emp)} · ${emp.email}` : displayName(emp)}
        >
          {displayName(emp)}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {emp.designation ?? roleDisplay(emp.role)}
          {emp.employeeId ? ` · ${emp.employeeId}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
          {roleDisplay(emp.role)}
        </Badge>
        <span className={cn("h-2 w-2 rounded-full", ROLE_DOT[canonicalRole(emp.role)] ?? "bg-muted-foreground/40")} />
      </div>
    </div>
  );
}

const MAX_TREE_DEPTH = 20;

function countSubtree(node: TreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countSubtree(child), 0);
}

function TreeBranch({ node, depth = 0, isLast = false }: { node: TreeNode; depth?: number; isLast?: boolean }) {
  const hasChildren = node.children.length > 0 && depth < MAX_TREE_DEPTH;

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <span
            className={cn(
              "absolute left-0 border-l border-border/60",
              isLast ? "top-0 h-5" : "top-0 h-full"
            )}
          />
          <span className="absolute left-0 top-5 w-4 border-t border-border/60" />
        </>
      )}

      <div className={cn(depth > 0 ? "pl-4" : "")}>
        <div className="flex items-center gap-2">
          <PersonCard emp={node.employee} size={depth > 1 ? "sm" : "md"} />
          {hasChildren && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {countSubtree(node) - 1} in team
            </Badge>
          )}
        </div>

        {hasChildren && (
          <div className="mt-2 ml-4 space-y-2">
            {node.children.map((child, idx) => (
              <TreeBranch
                key={child.employee.id}
                node={child}
                depth={depth + 1}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeLegend() {
  const items = [
    { label: "CEO", cls: ROLE_DOT.CEO },
    { label: "Admin", cls: ROLE_DOT.ADMIN },
    { label: "HR", cls: ROLE_DOT.HR },
    { label: "Other", cls: "bg-muted-foreground/40" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge key={item.label} variant="outline" className="text-[10px] h-6 gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", item.cls)} />
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: employeesRaw, isLoading } = useHrEmployees();
  const { data: departments } = useHrDepartments();

  const employees = useMemo(() => {
    const raw = (Array.isArray(employeesRaw)
      ? employeesRaw
      : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[];
    return dedupeEmployees(raw);
  }, [employeesRaw]);

  const tree = useMemo(() => buildTree(employees), [employees]);

  // True only if at least one person actually has a direct report. When every
  // employee is a root (no reportingTo set), the "tree" is really a flat list,
  // so we surface a hint instead of pretending it's a hierarchy.
  const hasHierarchy = useMemo(() => tree.some((n) => n.children.length > 0), [tree]);

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    departments?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const deptGroups = useMemo(() => {
    const groups = new Map<string, Employee[]>();
    for (const emp of employees) {
      const name = emp.departmentId ? (deptMap.get(emp.departmentId) ?? "Other") : "Unassigned";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(emp);
    }
    return Array.from(groups.entries())
      .map(([name, members]) => {
        const byRole = new Map<string, Employee[]>();
        for (const e of members) {
          const r = roleDisplay(e.role);
          if (!byRole.has(r)) byRole.set(r, []);
          byRole.get(r)!.push(e);
        }
        const roleGroups = Array.from(byRole.entries())
          .map(([role, people]) => ({
            role,
            people: people.sort((a, b) => displayName(a).localeCompare(displayName(b))),
          }))
          .sort((a, b) => a.role.localeCompare(b.role));
        return { name, members, roleGroups };
      })
      .sort((a, b) => {
        if (a.name === "Unassigned") return 1;
        if (b.name === "Unassigned") return -1;
        if (a.name === "Other") return 1;
        if (b.name === "Other") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [employees, deptMap]);

  const deptMemberTotal = useMemo(
    () => deptGroups.reduce((sum, g) => sum + g.members.length, 0),
    [deptGroups],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Team structure and departments">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization"
      subtitle={`${deptMemberTotal} members across ${deptGroups.length} departments`}
    >
      <Tabs defaultValue="tree">
        <TabsList className="h-9 mb-4">
          <TabsTrigger value="tree" className="text-xs gap-1.5 px-3">
            <Network className="h-3.5 w-3.5" />
            Hierarchy
          </TabsTrigger>
          <TabsTrigger value="departments" className="text-xs gap-1.5 px-3">
            <Building2 className="h-3.5 w-3.5" />
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {hasHierarchy
                    ? "Reporting tree with parent-child links and direct reports."
                    : "Reporting structure — assign managers to turn this into a tree."}
                </p>
                <TreeLegend />
              </div>
              {!hasHierarchy && employees.length > 0 && (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
                  No reporting managers are assigned yet, so everyone appears at the top level.
                  Set each person&apos;s manager in{" "}
                  <span className="font-medium">Employees → Edit → Reporting Manager</span>{" "}
                  to build the hierarchy.
                </div>
              )}
              <ScrollArea className="w-full" type="auto">
                <div className="space-y-2 min-w-[720px]">
                  {tree.map((root, idx) => (
                    <TreeBranch
                      key={root.employee.id}
                      node={root}
                      isLast={idx === tree.length - 1}
                    />
                  ))}
                  {tree.length === 0 && (
                    <EmptyState
                      illustration={<EmptyTeamIllustration className="h-32 w-32 opacity-95" />}
                      title="No reporting structure found"
                      description="Assign reporting managers to employees to build the org hierarchy."
                    />
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {deptGroups.map((dept) => (
              <Card key={dept.name} className="max-h-[min(420px,70vh)] flex flex-col">
                <CardContent className="p-4 flex flex-col min-h-0 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{dept.name}</h3>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Users className="h-3 w-3" />
                      {dept.members.length}
                    </Badge>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 pr-2 max-h-[280px]" type="auto">
                  <div className="space-y-3">
                    {dept.roleGroups.map((rg) => (
                      <div key={rg.role} className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {rg.role}
                          </span>
                          <Badge variant="outline" className="h-4 text-[9px] px-1.5">
                            {rg.people.length}
                          </Badge>
                        </div>
                        {rg.people.map((emp) => (
                          <div key={emp.id} className="flex items-center gap-2 pl-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={resolveImageUrl(emp.image)} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {initials(emp)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{displayName(emp)}</p>
                              {emp.designation && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {emp.designation}
                                </p>
                              )}
                            </div>
                            {emp.employeeId && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {emp.employeeId}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
