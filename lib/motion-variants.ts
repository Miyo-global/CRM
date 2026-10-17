import type { Variants } from "framer-motion";

/**
 * R3-D001: the pages used to fade, slide and stagger themselves in on every
 * load, which is the entrance choreography the redesign dropped. The names
 * stay so the call sites keep working, but every state is now identical, so
 * content is simply there when the page renders. Deliberate motion — a
 * dialog, a toast, a chart — animates at its own call site, not through here.
 */
const STATIC: Variants = { hidden: {}, visible: {} };

export const staggerContainer = STATIC;
export const fadeUp = STATIC;
export const fadeIn = STATIC;
export const slideInLeft = STATIC;
export const scaleIn = STATIC;
