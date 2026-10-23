/**
 * Limits shared by the page routes and their tests. A route file may only
 * export its handlers and route config, so these live here.
 */

/** The tree route returns at most this many nodes per request. */
export const TREE_NODE_CAP = 500;

/** A reopen inside this window is the same visit, not a new one. */
export const VISIT_DEDUPE_MS = 5 * 60 * 1000;
