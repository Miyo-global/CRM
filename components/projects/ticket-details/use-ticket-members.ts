"use client";

import { useMemo } from "react";
import type { ProjectWithDetails } from "@/types/projects";
import type { ProjectMember } from "./types";

type Person = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  email?: string | null;
};

function toMember(u: Person): ProjectMember {
  return {
    id: u.id,
    name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    firstName: u.firstName || undefined,
    lastName: u.lastName || undefined,
    image: u.image || null,
    email: u.email || "",
  };
}

export function useTicketMembers(project: (ProjectWithDetails & { manager?: Person | null }) | null | undefined) {
  return useMemo(() => {
    if (!project?.members) return [];
    const list = project.members.filter((m) => !!m.user).map((m) => toMember(m.user as Person));
    const mgr = project.manager;
    if (mgr && !list.some((m) => m.id === mgr.id)) list.unshift(toMember(mgr));
    return list;
  }, [project]);
}
