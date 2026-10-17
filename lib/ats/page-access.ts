import "server-only";

import { isAtsRole } from "@/lib/constants/roles";
import { visibleJobIds, type AtsActor } from "./access";

export interface AtsPageAccess {
  /** false means the page should answer notFound(). */
  allowed: boolean;
  /** null means every job in the org; a list means only these. */
  jobIds: number[] | null;
}

/**
 * MIYO-0645: who may open an ATS page. CEO, HR, ADMIN and RECRUITER work
 * every job; anyone else gets in only through a seat on a hiring team, and
 * then sees that job alone.
 */
export async function atsPageAccess(actor: AtsActor): Promise<AtsPageAccess> {
  const jobIds = await visibleJobIds(actor);
  if (isAtsRole(actor.role)) return { allowed: true, jobIds };
  return { allowed: (jobIds?.length ?? 0) > 0, jobIds };
}
