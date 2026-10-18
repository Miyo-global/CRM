export const KNOWLEDGE_ROOT = "/knowledge";
export const KB_CHAT = `${KNOWLEDGE_ROOT}/chat`;
export const KB_RESEARCH_BRIEFS = `${KNOWLEDGE_ROOT}/research-briefs`;
export const KNOWLEDGE_BASE = `${KNOWLEDGE_ROOT}/wiki`;

export const KB_TRASH = `${KNOWLEDGE_BASE}/trash`;
export const KB_TEMPLATES = `${KNOWLEDGE_BASE}/templates`;
export const KB_ANALYTICS = `${KNOWLEDGE_BASE}/analytics`;
export const KB_PRIVATE = `${KNOWLEDGE_BASE}/private`;
export const KB_SHARED = `${KNOWLEDGE_BASE}/shared`;
export const KB_SPACES = `${KNOWLEDGE_BASE}/spaces`;
export const KB_MANAGE = `${KNOWLEDGE_BASE}/manage`;
export const KB_REVIEWS = `${KNOWLEDGE_BASE}/reviews`;
export const KB_IMPORT = `${KNOWLEDGE_BASE}/import`;
export const KB_SEARCH = `${KNOWLEDGE_BASE}/search`;
export const KB_COMPANY_DOCUMENTS = `${KNOWLEDGE_BASE}/company-documents`;

/** `/doc/` and not `/pages/`, so the App Router never confuses it with the old pages router. */
export function pageHref(pageId: string): string {
  return `${KNOWLEDGE_BASE}/doc/${pageId}`;
}

export function pageHistoryHref(pageId: string): string {
  return `${pageHref(pageId)}/history`;
}

export function spaceHref(spaceId: string): string {
  return `${KB_SPACES}/${spaceId}`;
}

export function companyDocumentHref(linkedDocumentId: string): string {
  return `${KB_COMPANY_DOCUMENTS}/${linkedDocumentId}`;
}

/** KB-backed project wiki lives under the existing project route tree (D3). */
export function projectPageHref(projectId: string, pageId: string): string {
  return `/projects/${projectId}/pages/${pageId}`;
}

export function researchBriefHref(briefId: string): string {
  return `${KB_RESEARCH_BRIEFS}/${briefId}`;
}
