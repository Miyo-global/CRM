/**
 * Centralised pagination constants.
 * Replaces magic numbers (20, 50, 100, 200, 500, 10000, 50000) in 16+ API routes.
 */

export const DEFAULT_PAGE_SIZE = 20;

export const TASKS_PAGE_SIZE = 50;

export const MESSAGES_PAGE_SIZE = 50;

export const LARGE_LIST_LIMIT = 200;

export const MAX_LIST_LIMIT = 500;

export const EXPORT_LIMIT = 50_000;

export const QUOTES_EXPORT_LIMIT = 10_000;

export const CLIENTS_EXPORT_LIMIT = 10_000;
