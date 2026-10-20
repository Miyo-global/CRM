export interface OrgPerson {
  id: string;
  name?: string | null;
  role?: string | null;
  departmentId?: number | null;
  reportingTo?: string | null;
}

export interface TreeNode<T extends OrgPerson> {
  employee: T;
  children: TreeNode<T>[];
}

export interface DepartmentRoot<T extends OrgPerson> {
  department: string;
  nodes: TreeNode<T>[];
}

const ROLE_PRIORITY: Record<string, number> = { CEO: 0, ADMIN: 1, HR: 2 };

/** Manager tree from `reportingTo`; self-links, unknown managers and cycles become roots. */
export function buildTree<T extends OrgPerson>(people: T[], nameOf: (p: T) => string): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  for (const p of people) map.set(p.id, { employee: p, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const p of people) {
    const node = map.get(p.id)!;
    const manager = p.reportingTo && p.reportingTo !== p.id ? map.get(p.reportingTo) : undefined;
    if (manager) manager.children.push(node);
    else roots.push(node);
  }

  // Anyone not reachable from a root sits in a reporting cycle: cut the cycle
  // at the first unreached person and make them a root.
  const reached = new Set<string>();
  const walk = (node: TreeNode<T>) => {
    reached.add(node.employee.id);
    node.children = node.children.filter((c) => !reached.has(c.employee.id));
    node.children.forEach(walk);
  };
  roots.forEach(walk);
  for (const p of people) {
    if (reached.has(p.id)) continue;
    const node = map.get(p.id)!;
    for (const other of map.values()) other.children = other.children.filter((c) => c !== node);
    roots.push(node);
    walk(node);
  }

  const sort = (nodes: TreeNode<T>[]) => {
    nodes.sort((a, b) => {
      const pa = ROLE_PRIORITY[a.employee.role ?? ""] ?? 99;
      const pb = ROLE_PRIORITY[b.employee.role ?? ""] ?? 99;
      return pa !== pb ? pa - pb : nameOf(a.employee).localeCompare(nameOf(b.employee));
    });
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/**
 * When most people have no manager the tree is a flat list. Group the roots
 * under their department instead so the chart still has structure (QA-DES-04).
 * Returns null when the reporting data is good enough to show as is.
 */
export function departmentFallback<T extends OrgPerson>(
  roots: TreeNode<T>[],
  total: number,
  departmentName: (id: number | null | undefined) => string,
): DepartmentRoot<T>[] | null {
  const loose = roots.filter((r) => r.children.length === 0).length;
  if (total === 0 || loose * 2 <= total) return null;

  const groups = new Map<string, TreeNode<T>[]>();
  for (const root of roots) {
    const name = departmentName(root.employee.departmentId);
    groups.set(name, [...(groups.get(name) ?? []), root]);
  }
  return Array.from(groups, ([department, nodes]) => ({ department, nodes })).sort((a, b) =>
    a.department.localeCompare(b.department),
  );
}

export function countSubtree<T extends OrgPerson>(node: TreeNode<T>): number {
  return 1 + node.children.reduce((sum, c) => sum + countSubtree(c), 0);
}
