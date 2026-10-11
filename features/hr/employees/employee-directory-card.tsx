import Link from "next/link";
import { Mail } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, resolveImageUrl } from "@/lib/utils";

/** Roles that lead people; their avatar gets the gold ring (logo circle motif). */
const MANAGER_ROLES = new Set(["CEO", "BRANCH_MANAGER"]);

interface EmployeeDirectoryCardProps {
  id: string;
  name: string;
  initials: string;
  email: string;
  role?: string | null;
  roleLabel?: string | null;
  designation?: string | null;
  department?: string | null;
  image?: string | null;
  isActive: boolean;
}

/** Directory card for the people grid (§8.3 card grid, Appendix A `/hr`). */
export function EmployeeDirectoryCard({
  id,
  name,
  initials,
  email,
  role,
  roleLabel,
  designation,
  department,
  image,
  isActive,
}: EmployeeDirectoryCardProps) {
  const isManager = !!role && MANAGER_ROLES.has(role);
  return (
    <Link href={`/hr/employees/${id}`} className="block h-full rounded-lg outline-none focus-visible:focus-ring">
      <Card interactive className="h-full gap-0 p-4">
        <div className="flex items-start gap-3">
          <Avatar
            className={cn(
              "size-12 shrink-0",
              isManager && "ring-2 ring-gold-400 ring-offset-2 ring-offset-card",
            )}
          >
            <AvatarImage src={resolveImageUrl(image)} alt="" />
            <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground" title={name}>
              {name}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={designation ?? roleLabel ?? undefined}>
              {designation || roleLabel || "—"}
            </p>
          </div>
          <StatusPill tone={isActive ? "success" : "neutral"} dot className="shrink-0">
            {isActive ? "Active" : "Inactive"}
          </StatusPill>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {department ? (
            <Badge variant="secondary" className="max-w-full truncate">
              {department}
            </Badge>
          ) : null}
          {roleLabel && designation ? (
            <Badge variant="outline" className="max-w-full truncate">
              {roleLabel}
            </Badge>
          ) : null}
        </div>
        <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted-foreground" title={email}>
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{email}</span>
        </p>
      </Card>
    </Link>
  );
}
