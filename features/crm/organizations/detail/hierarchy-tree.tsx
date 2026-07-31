"use client";

import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgHierarchyNode } from "@/types/crm";

interface HierarchyNodeProps {
  node: OrgHierarchyNode;
  currentId: number;
  depth?: number;
}

function HierarchyNodeCard({ node, currentId, depth = 0 }: HierarchyNodeProps) {
  const isCurrent = node.id === currentId;
  return (
    <div className={cn("flex flex-col gap-1", depth > 0 && "ml-5 border-l border-border/60 pl-4")}>
      <Link
        href={`/crm/organizations/${node.id}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isCurrent
            ? "bg-gold/10 text-gold font-medium pointer-events-none"
            : "hover:bg-accent text-foreground",
        )}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        {node.industry && (
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{node.industry}</span>
        )}
        {!isCurrent && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />}
      </Link>
      {node.children.map((child) => (
        <HierarchyNodeCard key={child.id} node={child} currentId={currentId} depth={depth + 1} />
      ))}
    </div>
  );
}

interface HierarchyTreeProps {
  root: OrgHierarchyNode;
  currentId: number;
  ancestors: { id: number; name: string }[];
}

export function HierarchyTree({ root, currentId, ancestors }: HierarchyTreeProps) {
  return (
    <div className="space-y-2">
      {ancestors.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 flex-wrap">
          {ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <Link href={`/crm/organizations/${a.id}`} className="hover:text-foreground transition-colors">
                {a.name}
              </Link>
            </span>
          ))}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{root.name}</span>
        </div>
      )}

      <HierarchyNodeCard node={root} currentId={currentId} depth={0} />
    </div>
  );
}
