"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { HelpdeskTicket, TicketStatus } from "@/types/hr";

export type HelpdeskCommentKind = "comment" | "internal_note" | "status_change";

export interface HelpdeskTicketComment {
  id: number;
  ticketId: number;
  authorId: string | null;
  kind: HelpdeskCommentKind;
  body: string | null;
  metadata: { from?: string | null; to?: string | null } | null;
  createdAt: string | null;
  authorName: string | null;
  authorImage: string | null;
}

const helpdeskKeys = {
  comments: (ticketId: number) =>
    [...queryKeys.hr.all, "helpdesk", "comments", ticketId] as const,
};

export function useHelpdeskTicketComments(ticketId: number | null) {
  return useQuery({
    queryKey: helpdeskKeys.comments(ticketId ?? 0),
    enabled: ticketId != null && ticketId > 0,
    queryFn: () =>
      apiClient.get<HelpdeskTicketComment[]>(
        `/hr/helpdesk/${ticketId}/comments`,
      ),
  });
}

export function useAddHelpdeskTicketComment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; kind?: Exclude<HelpdeskCommentKind, "status_change"> }) =>
      apiClient.post<HelpdeskTicketComment>(
        `/hr/helpdesk/${ticketId}/comments`,
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.comments(ticketId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.helpdeskTickets() });
    },
  });
}

export interface UpdateHelpdeskTicketInput {
  status?: TicketStatus;
  assigneeId?: string | null;
  resolution?: string;
}

export function useUpdateHelpdeskTicket(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHelpdeskTicketInput) =>
      apiClient.patch<HelpdeskTicket>(`/hr/helpdesk/${ticketId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.helpdeskTickets() });
      qc.invalidateQueries({ queryKey: helpdeskKeys.comments(ticketId) });
    },
  });
}

export interface HelpdeskAssigneeOption {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

interface MembersResponse {
  data: HelpdeskAssigneeOption[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const SUPPORT_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR", "IT", "OPERATIONS"];

export function useHelpdeskAssignees(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "helpdesk", "assignees"] as const,
    enabled,
    queryFn: async () => {
      const res = await apiClient.get<MembersResponse>("/organization/members", {
        page: "1",
        limit: "500",
        roles: SUPPORT_ROLES.join(","),
      });
      return res.data;
    },
  });
}
