import axios from "axios";

const TECHNICAL_PATTERNS: RegExp[] = [
  /\/api\/[^\s]+/gi,
  /\bapp\/api\/[^\s]+/gi,
  /NextRequest|NextResponse|parseBody|withAuth/gi,
  /Select\.Item|CommandItem/gi,
  /at\s+[\w./]+:\d+:\d+/g,
  /ZodError|ValidationError/gi,
];

function sanitizeUserMessage(message: string): string {
  let out = message.trim();
  for (const pattern of TECHNICAL_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  if (!out || out.length < 3) return "Something went wrong. Please try again.";
  return out;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      return sanitizeUserMessage(String((data as { error: string }).error));
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
