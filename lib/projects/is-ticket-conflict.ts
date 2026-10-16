import axios from "axios";
import { TICKET_CONFLICT_CODE } from "@/lib/projects/ticket-conflict-code";

export function isTicketConflict(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as { code?: string } | undefined;
  return error.response?.status === 409 && data?.code === TICKET_CONFLICT_CODE;
}
