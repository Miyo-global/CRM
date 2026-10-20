import { describe, expect, it } from "vitest";
import { buildTree, countSubtree, departmentFallback, type OrgPerson } from "./org-tree";

const name = (p: OrgPerson) => p.name ?? p.id;
const ids = (nodes: { employee: OrgPerson }[]) => nodes.map((n) => n.employee.id);

describe("buildTree", () => {
  it("nests people under their manager, CEO first", () => {
    const roots = buildTree(
      [
        { id: "b", name: "Bea", reportingTo: "ceo" },
        { id: "c", name: "Cal", reportingTo: "b" },
        { id: "z", name: "Zed" },
        { id: "ceo", name: "Ann", role: "CEO" },
      ],
      name,
    );
    expect(ids(roots)).toEqual(["ceo", "z"]);
    expect(countSubtree(roots[0]!)).toBe(3);
  });

  it("breaks reporting cycles instead of losing people", () => {
    const roots = buildTree(
      [
        { id: "a", reportingTo: "b" },
        { id: "b", reportingTo: "a" },
        { id: "s", reportingTo: "s" },
      ],
      name,
    );
    const all = new Set<string>();
    const visit = (n: { employee: OrgPerson; children: unknown[] }) => {
      all.add(n.employee.id);
      (n.children as typeof roots).forEach(visit);
    };
    roots.forEach(visit);
    expect([...all].sort()).toEqual(["a", "b", "s"]);
  });
});

describe("departmentFallback", () => {
  const dept = (id: number | null | undefined) => (id === 1 ? "Eng" : "No department");

  it("groups roots by department when most people have no manager", () => {
    const people = [
      { id: "a", departmentId: 1 },
      { id: "b", departmentId: 1 },
      { id: "c", departmentId: null },
    ];
    const groups = departmentFallback(buildTree(people, name), people.length, dept);
    expect(groups?.map((g) => [g.department, ids(g.nodes)])).toEqual([
      ["Eng", ["a", "b"]],
      ["No department", ["c"]],
    ]);
  });

  it("keeps the real tree when reporting data is mostly there", () => {
    const people = [{ id: "m" }, { id: "a", reportingTo: "m" }, { id: "b", reportingTo: "m" }];
    expect(departmentFallback(buildTree(people, name), people.length, dept)).toBeNull();
  });
});
