import axios from "axios";

const TECHNICAL_PATTERNS: RegExp[] = [
  /\/api\/[^\s]+/gi,
  /\bapp\/api\/[^\s]+/gi,
  /NextRequest|NextResponse|parseBody|withAuth/gi,
  /Select\.Item|CommandItem/gi,
  /at\s+[\w./]+:\d+:\d+/g,
  /ZodError|ValidationError/gi,
];

/** Any match means the message is a raw server/DB error: show the generic text. */
const SENSITIVE_PATTERNS: RegExp[] = [
  /Failed query:/i,
  /\bparams:/i,
  /\b(select|insert into|update|delete from)\b[^.]*\bfrom\s+"?\w+"?\s*(where|limit|join|order|;|$)/im,
  /\b(relation|column) "[^"]+"( of relation "[^"]+")? does not exist/i,
  /violates (unique|foreign key|not-null|check) constraint/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /\borg_[a-z0-9]+/i,
  /\bat\s+[\w$.<>]+\s*\(/,
];

const GENERIC = "Something went wrong. Please try again.";

function sanitizeUserMessage(message: string): string {
  if (SENSITIVE_PATTERNS.some((p) => p.test(message))) return GENERIC;
  let out = message.trim();
  for (const pattern of TECHNICAL_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  if (!out || out.length < 3) return GENERIC;
  return out;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const { error: msg, errorId } = data as { error: string; errorId?: string };
      const clean = sanitizeUserMessage(String(msg));
      return errorId ? `${clean} (ref ${errorId})` : clean;
    }
    if (error.response?.status === 401) return "Session expired. Please sign in again.";
    if (error.response?.status === 403) return "You don't have permission for this action.";
    if (error.response?.status === 404) return "The requested resource was not found.";
    if (error.response?.status === 409) return "A conflict occurred. The item may already exist.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment.";
    if (error.response?.status && error.response.status >= 500) return "Server error. Please try again later.";
    return error.message || "Request failed";
  }
  if (error instanceof Error) {
    if (error.message.includes("Network Error")) return "Network error. Check your connection.";
    return sanitizeUserMessage(error.message);
  }
  if (typeof error === "string") return error;
  return "Something went wrong";
}
