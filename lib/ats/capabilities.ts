/**
 * MIYO-0629: the capability rules on their own, with no database behind them,
 * so they can be read and tested directly. `lib/ats/access.ts` looks up the
 * job membership and then asks these.
 */
import { ROLES } from "@/lib/constants/roles";

export type AtsCapability =
  | "view"
  | "manage_candidates"
  | "schedule_interviews"
  | "submit_scorecard"
  | "manage_job"
  | "manage_offers";

export const ALL_CAPABILITIES: readonly AtsCapability[] = [
  "view",
  "manage_candidates",
  "schedule_interviews",
  "submit_scorecard",
  "manage_job",
  "manage_offers",
];

export const MEMBER_CAPABILITIES: Record<string, readonly AtsCapability[]> = {
  RECRUITER: ALL_CAPABILITIES,
  HIRING_MANAGER: ["view", "manage_candidates", "schedule_interviews", "submit_scorecard"],
  // An interviewer sees the candidates they are meeting and scores them; they
  // do not move anyone through the pipeline.
  INTERVIEWER: ["view", "submit_scorecard"],
};

/** CEO, HR and ADMIN work every job in the org. */
export function isOrgWideAtsRole(role: string | null | undefined): boolean {
  return role === ROLES.CEO || role === ROLES.HR || role === ROLES.ADMIN;
}

/** What a system role carries on every job, before job membership widens it. */
export function orgWideCapabilities(role: string | null | undefined): readonly AtsCapability[] {
  if (isOrgWideAtsRole(role)) return ALL_CAPABILITIES;
  if (role === ROLES.RECRUITER) return MEMBER_CAPABILITIES.RECRUITER;
  return [];
}

/** Role plus the seat held on this job's hiring team. */
export function capabilitiesFor(
  role: string | null | undefined,
  memberRole: string | null | undefined,
): Set<AtsCapability> {
  const capabilities = new Set<AtsCapability>(orgWideCapabilities(role));
  for (const capability of (memberRole && MEMBER_CAPABILITIES[memberRole]) || []) {
    capabilities.add(capability);
  }
  return capabilities;
}
