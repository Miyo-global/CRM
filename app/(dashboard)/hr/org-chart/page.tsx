"use client";

import { useMemo, useState } from "react";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { useHrOrgChart } from "@/lib/api/hooks/hr/employees";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Users, Network, Building2, ChevronRight } from "lucide-react";
import type { Employee } from "@/types/hr";
import { EmptyState } from "@/components/ui/empty-state";
import { getRoleLabel, isSystemRole } from "@/lib/rbac/roles";
import {
  buildTree, countSubtree, departmentFallback, type TreeNode as OrgTreeNode,
} from "@/features/hr/org-chart/org-tree";

type TreeNode = OrgTreeNode<Employee>;

const ROLE_DOT: Record<string, string> = {
  CEO: "bg-warning-500",
  HR: "bg-plum-500",
  ADMIN: "bg-info-500",
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

/** Name and designation, each clamped to two lines with the full text as a tooltip (QA-DES-04). */
function PersonCard({ emp, size = "md" }: { emp: Employee; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  const title = emp.designation ?? roleDisplay(emp.role);
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md",
      isSm ? "w-56" : "w-60"
    )}>
      <Avatar className={isSm ? "size-8" : "size-9"}>
        <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
        <AvatarFallback className="bg-brand-soft text-brand-soft-foreground text-xs">
          {initials(emp)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p
          className={cn("flex items-center gap-1.5 font-medium", isSm ? "text-xs" : "text-sm")}
          title={emp.email ? `${displayName(emp)} · ${emp.email}` : displayName(emp)}
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", ROLE_DOT[canonicalRole(emp.role)] ?? "bg-ink-300")}
            aria-hidden="true"
          />
          <span className="line-clamp-2 break-words">{displayName(emp)}</span>
        </p>
        <p className="line-clamp-2 break-words text-2xs text-muted-foreground" title={title}>
          {title}
        </p>
      </div>
    </div>
  );
}

const MAX_TREE_DEPTH = 20;

function TreeBranch({ node, depth = 0, isLast = false }: { node: TreeNode; depth?: number; isLast?: boolean }) {
  const hasChildren = node.children.length > 0 && depth < MAX_TREE_DEPTH;
  // The first two levels start open; deeper teams start collapsed.
  const [open, setOpen] = useState(depth < 2);

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <span
            className={cn(
              "absolute left-0 border-l border-border-strong",
              isLast ? "top-0 h-5" : "top-0 h-full"
            )}
          />
          <span className="absolute left-0 top-5 w-4 border-t border-border-strong" />
        </>
      )}

      <div className={cn(depth > 0 ? "pl-4" : "")}>
        <div className="flex items-center gap-2">
          <PersonCard emp={node.employee} size={depth > 1 ? "sm" : "md"} />
          {hasChildren && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${displayName(node.employee)}'s team`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs tabular-nums text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:focus-ring"
            >
              <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} aria-hidden="true" />
              {countSubtree(node) - 1} in team
            </button>
          )}
        </div>

        {hasChildren && open && (
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
    { label: "Other", cls: "bg-ink-300" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge key={item.label} variant="outline" className="gap-1.5">
          <span className={cn("size-2 rounded-full", item.cls)} aria-hidden="true" />
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: employeesRaw, isLoading, isError, error, refetch } = useHrEmployees();
  const { data: departments } = useHrDepartments();
  // /hr/employees strips the reporting chain for non-admins (QA-0062), which
  // left everyone's chart flat; the org-chart endpoint carries it for all.
  const { data: orgChart } = useHrOrgChart();

  const employees = useMemo(() => {
    const raw = (Array.isArray(employeesRaw)
      ? employeesRaw
      : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[];
    const managerOf = new Map((orgChart ?? []).map((n) => [n.id, n.reportingTo]));
    return dedupeEmployees(raw).map((e) =>
      managerOf.has(e.id) ? { ...e, reportingTo: managerOf.get(e.id) ?? null } : e,
    );
  }, [employeesRaw, orgChart]);

  const tree = useMemo(() => buildTree(employees, displayName), [employees]);

  // True only if at least one person actually has a direct report. When every
  // employee is a root (no reportingTo set), the "tree" is really a flat list,
  // so we surface a hint instead of pretending it's a hierarchy.
  const hasHierarchy = useMemo(() => tree.some((n) => n.children.length > 0), [tree]);

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    departments?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const fallbackGroups = useMemo(
    () => departmentFallback(tree, employees.length, (id) => (id && deptMap.get(id)) || "No department"),
    [tree, employees.length, deptMap],
  );

  const deptGroups = useMemo(() => {
    const groups = new Map<string, Employee[]>();
    for (const emp of employees) {
      // A department id with no matching record went to "Other" while people
      // with no department went to "Unassigned", which read as two kinds of
      // the same thing (QA-D008). Both are "No department".
      const name = (emp.departmentId && deptMap.get(emp.departmentId)) || "No department";
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
        if (a.name === "No department") return 1;
        if (b.name === "No department") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [employees, deptMap]);

  // Active people, counted once. Summing the department groups counted
  // deactivated accounts too, so the org chart said 16 members where the rest
  // of HR said 15 (QA-0047).
  const activeMemberTotal = useMemo(
    () => employees.filter((e) => e.isActive !== false).length,
    [employees],
  );
  const inactiveMemberTotal = employees.length - activeMemberTotal;

  if (isLoading) {
    return (
      <PageWrapper title="Organization">
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization"
      subtitle={`${activeMemberTotal} active ${activeMemberTotal === 1 ? "member" : "members"} across ${deptGroups.length} departments${
        inactiveMemberTotal > 0 ? ` · ${inactiveMemberTotal} deactivated` : ""
      }`}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load the organization" error={error} onRetry={() => refetch()} />
      ) : (
      <Tabs defaultValue="tree">
        <TabsList variant="underline" className="mb-4">
          <TabsTrigger value="tree" className="gap-1.5">
            <Network className="size-4" aria-hidden="true" />
            Hierarchy
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="size-4" aria-hidden="true" />
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="space-y-3 p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {hasHierarchy
                    ? "Reporting tree with parent-child links and direct reports."
                    : "Reporting structure — assign managers to turn this into a tree."}
                </p>
                <TreeLegend />
              </div>
              {!hasHierarchy && employees.length > 0 && (
                <div role="note" className="mx-4 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning-strong">
                  No reporting managers are assigned yet, so people are grouped by department.
                  Set each person&apos;s manager in{" "}
                  <span className="font-medium">Employees → Edit → Reporting Manager</span>{" "}
                  to build the hierarchy.
                </div>
              )}
              <ScrollArea
                className="w-full bg-background"
                type="auto"
              >
                <div className="min-w-[720px] space-y-2 p-4">
                  {fallbackGroups
                    ? fallbackGroups.map((group) => (
                        <details key={group.department} open className="group/dept">
                          <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-1 text-sm font-semibold hover:bg-accent focus-visible:focus-ring">
                            <ChevronRight className="size-4 transition-transform group-open/dept:rotate-90" aria-hidden="true" />
                            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                            {group.department}
                            <Badge variant="secondary" className="tabular-nums">
                              {group.nodes.reduce((sum, n) => sum + countSubtree(n), 0)}
                            </Badge>
                          </summary>
                          <div className="mt-2 ml-6 space-y-2">
                            {group.nodes.map((root, idx) => (
                              <TreeBranch key={root.employee.id} node={root} depth={1} isLast={idx === group.nodes.length - 1} />
                            ))}
                          </div>
                        </details>
                      ))
                    : tree.map((root, idx) => (
                        <TreeBranch
                          key={root.employee.id}
                          node={root}
                          isLast={idx === tree.length - 1}
                        />
                      ))}
                  {tree.length === 0 && (
                    <EmptyState
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
              <Card key={dept.name} className="flex max-h-[min(420px,70vh)] flex-col">
                <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{dept.name}</h3>
                    <Badge variant="secondary" className="gap-1 tabular-nums">
                      <Users className="size-3" aria-hidden="true" />
                      {dept.members.length}
                    </Badge>
                  </div>
                  <ScrollArea className="max-h-72 min-h-0 flex-1 pr-2" type="auto">
                  <div className="space-y-3">
                    {dept.roleGroups.map((rg) => (
                      <div key={rg.role} className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                            {rg.role}
                          </span>
                          <Badge variant="outline" className="h-4 px-1.5 text-3xs tabular-nums">
                            {rg.people.length}
                          </Badge>
                        </div>
                        {rg.people.map((emp) => (
                          <div key={emp.id} className="flex items-center gap-2 pl-1">
                            <Avatar className="size-6">
                              <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
                              <AvatarFallback className="text-3xs bg-brand-soft text-brand-soft-foreground">
                                {initials(emp)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium break-words">{displayName(emp)}</p>
                              {emp.designation && (
                                <p className="text-2xs text-muted-foreground break-words">
                                  {emp.designation}
                                </p>
                              )}
                            </div>
                            {emp.employeeId && (
                              <span className="shrink-0 font-mono text-2xs text-muted-foreground">
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
      )}
    </PageWrapper>
  );
}
