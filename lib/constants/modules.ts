/**
 * Optional modules.
 *
 * The CRM side of the app (leads, deals, contacts) ships behind a flag: HR-only
 * deployments should not be offered Deals notification categories or Deal
 * custom fields (A36). Set NEXT_PUBLIC_CRM_MODULE=on to enable it.
 *
 * OPEN QUESTION for Tarun: confirm the CRM module stays off for Miyo Global.
 */
export const CRM_MODULE_ENABLED = process.env.NEXT_PUBLIC_CRM_MODULE === "on";

/**
 * AI features (AI hub, AI-assisted drafts). The hub is only offered when a
 * provider key is configured server-side, so an unconfigured deployment never
 * shows users a page of dead actions (QA-0003). Set NEXT_PUBLIC_AI_MODULE=on
 * together with the server-side provider key to enable it.
 */
export const AI_MODULE_ENABLED = process.env.NEXT_PUBLIC_AI_MODULE === "on";

/**
 * The ATS (job requisitions, careers site, candidate pipeline). It replaces
 * the Recruitment module removed in October 2026 and ships off until a
 * deployment asks for it: set NEXT_PUBLIC_ATS_MODULE=on.
 */
export const ATS_MODULE_ENABLED = process.env.NEXT_PUBLIC_ATS_MODULE === "on";
