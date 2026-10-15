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
