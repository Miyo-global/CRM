/**
 * Optional modules. The sales CRM (leads, deals, contacts) and its
 * NEXT_PUBLIC_CRM_MODULE flag were removed: Miyo Global has no sales features.
 */

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
