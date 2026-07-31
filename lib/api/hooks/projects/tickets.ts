"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Ticket,
  TicketComment,
  TicketLabel,
  TicketUser,
  CustomState,
  PaginatedResponse,
  TicketFilters,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateLabelInput,
} from "@/types/projects";

export type AddCommentActor = Pick<
  TicketUser,
  "id" | "name" | "firstName" | "lastName" | "email" | "image"
>;

export type AddCommentVariables = {
  ticketId: number;
  projectId: number;
  content: string;
  images?: { url: string; key: string; fileName: string; mimeType?: string }[];
  actor?: AddCommentActor;
};

type NewCommentResponse = Pick<
  TicketComment,
  | "id"
  | "orgId"
  | "ticketId"
  | "userId"
  | "content"
  | "parentCommentId"
  | "createdAt"
  | "updatedAt"
>;
import { useProjectLabels } from "./projects";

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<PaginatedResponse<Ticket>>({
    queryKey: queryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, filters as Record<string, unknown>),
    enabled: !!projectId,
    ...options,
  });
}

export function useTicket(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket | null>({
    queryKey: queryKeys.projects.ticket(ticketId),
    queryFn: () =>
      apiClient.get<Ticket | null>(`/projects/${projectId}/tickets/${ticketId}`),
    enabled: !!ticketId && !!projectId,
    ...options,
  });
}

export function useCreateTicket(
  options?: Omit<UseMutationOptions<Ticket, Error, CreateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<Ticket, Error, CreateTicketInput>({
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(`/projects/${projectId}/tickets`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, UpdateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateTicketInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
    ...options,
  });
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    ...options,
  });
}

export function useMoveTicket(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, items }: MoveTicketInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}/tickets/reorder`, { items }),
    onSuccess: (_data: unknown, variables: MoveTicketInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useCustomStates(
  projectId: number,
  options?: Omit<UseQueryOptions<CustomState[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<CustomState[]>({
    queryKey: [...queryKeys.projects.all, "customStates", projectId] as const,
    queryFn: () =>
      apiClient.get<CustomState[]>(`/projects/${projectId}/custom-states`),
    enabled: !!projectId,
    ...options,
  });
}

export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

type AddCommentMutationContext = {
  previous: Ticket | null | undefined;
  tempId: number;
};

export function useAddComment(
  options?: Omit<
    UseMutationOptions<NewCommentResponse, Error, AddCommentVariables, AddCommentMutationContext>,
    "mutationFn" | "onMutate" | "onError" | "onSuccess"
  > & {
    onSuccess?: (
      data: NewCommentResponse,
      variables: AddCommentVariables,
      context: AddCommentMutationContext | undefined
    ) => void;
    onError?: (
      err: Error,
      variables: AddCommentVariables,
      context: AddCommentMutationContext | undefined
    ) => void;
  }
) {
  const queryClient = useQueryClient();
  const { onSuccess: userOnSuccess, onError: userOnError, ...rest } = options ?? {};
  return useMutation<
    NewCommentResponse,
    Error,
    AddCommentVariables,
    AddCommentMutationContext
  >({
    ...rest,
    mutationFn: ({ ticketId, projectId, content, images }) =>
      apiClient.post<NewCommentResponse>(
        `/projects/${projectId}/tickets/${ticketId}/comments`,
        { content, ...(images?.length ? { images } : {}) }
      ),
    onMutate: async (variables) => {
      const { ticketId, content, actor } = variables;
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.ticket(ticketId),
      });
      const previous = queryClient.getQueryData<Ticket | null>(
        queryKeys.projects.ticket(ticketId)
      );
      const tempId = -Math.abs(Date.now());
      if (previous) {
        const optimistic: TicketComment = {
          id: tempId,
          orgId: previous.orgId,
          ticketId,
          userId: actor?.id ?? "",
          content,
          parentCommentId: null,
          images: variables.images ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: actor,
        };
        queryClient.setQueryData<Ticket | null>(queryKeys.projects.ticket(ticketId), {
          ...previous,
          comments: [...(previous.comments ?? []), optimistic],
        });
      }
      return { previous, tempId };
    },
    onError: (err, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          queryKeys.projects.ticket(variables.ticketId),
          context.previous
        );
      }
      userOnError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      const actor = variables.actor;
      const merged: TicketComment = {
        ...data,
        user: actor
          ? {
              id: actor.id,
              name: actor.name,
              firstName: actor.firstName,
              lastName: actor.lastName,
              email: actor.email,
              image: actor.image,
            }
          : undefined,
      };
      queryClient.setQueryData<Ticket | null>(
        queryKeys.projects.ticket(variables.ticketId),
        (old) => {
          if (!old) return old;
          const list = [...(old.comments ?? [])];
          const tempId = context?.tempId;
          const tempIdx = tempId != null ? list.findIndex((c) => c.id === tempId) : -1;
          if (tempIdx >= 0) {
            list[tempIdx] = merged;
          } else if (!list.some((c) => c.id === merged.id)) {
            list.push(merged);
          }
          return { ...old, comments: list };
        }
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      userOnSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateTicketComment(
  options?: Omit<
    UseMutationOptions<
      { id: number; content: string; updatedAt: string | Date | null },
      Error,
      { ticketId: number; projectId?: number; commentId: number; content: string }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; content: string; updatedAt: string | Date | null },
    Error,
    { ticketId: number; projectId?: number; commentId: number; content: string }
  >({
    mutationFn: ({ ticketId, projectId = 0, commentId, content }) =>
      apiClient.patch<{ id: number; content: string; updatedAt: string | Date | null }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { content }
      ),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Ticket | null>(
        queryKeys.projects.ticket(variables.ticketId),
        (old) => {
          if (!old?.comments) return old;
          return {
            ...old,
            comments: old.comments.map((c) =>
              c.id === variables.commentId
                ? { ...c, content: data.content, updatedAt: data.updatedAt }
                : c
            ),
          };
        }
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useDeleteTicketComment(
  options?: Omit<
    UseMutationOptions<
      { success: boolean },
      Error,
      { ticketId: number; projectId?: number; commentId: number }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { ticketId: number; projectId?: number; commentId: number }
  >({
    mutationFn: ({ ticketId, projectId = 0, commentId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<Ticket | null>(
        queryKeys.projects.ticket(variables.ticketId),
        (old) => {
          if (!old?.comments) return old;
          return {
            ...old,
            comments: old.comments.filter((c) => c.id !== variables.commentId),
          };
        }
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.post<{ success: boolean }>(`/projects/${projectId}/tickets/${ticketId}/labels`, { labelId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useRemoveLabelFromTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/labels/${labelId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useSubtasks(
  ticketId: number,
  projectId?: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket[]>({
    queryKey: [...queryKeys.projects.all, "subtasks", { ticketId }],
    queryFn: () => apiClient.get<Ticket[]>(`/projects/${projectId ?? 0}/tickets/${ticketId}/subtasks`),
    enabled: ticketId > 0 && (projectId ?? 0) > 0,
    ...options,
  });
}

export function useUpdateTicketOrder(options?: Parameters<typeof useMutation>[0]) {
  return useMoveTicket(options);
}

export function useCreateOrgLabel(
  options?: Omit<UseMutationOptions<TicketLabel, Error, CreateLabelInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<TicketLabel, Error, CreateLabelInput>({
    mutationFn: (data) =>
      apiClient.post<TicketLabel>("/projects/labels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.labels() });
    },
    ...options,
  });
}

type AddAttachmentInput = {
  ticketId: number;
  projectId?: number;
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileSize: number;
  mimeType: string;
};


export interface BulkUpdateTicketsInput {
  ticketIds: number[];
  assigneeId?: string;
  status?: string;
  sprintId?: number | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export function useBulkUpdateTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkUpdateTicketsInput) =>
      apiClient.post<{ updated: number; ticketIds: number[] }>(
        `/projects/${projectId}/tickets/bulk`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets() });
    },
  });
}


export type WorkItemRelationType = "blocks" | "blocked_by" | "duplicate_of" | "relates_to";

export interface TicketRelation {
  id: number;
  relationType: WorkItemRelationType;
  relatedTicket: {
    id: number;
    title: string;
    ticketNumber: number | null;
    status: string | null;
    priority: string | null;
  } | null;
  direction: "outgoing" | "incoming";
}

export function useTicketRelations(ticketId: number, projectId: number) {
  return useQuery({
    queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
    queryFn: () =>
      apiClient.get<TicketRelation[]>(`/projects/${projectId}/tickets/${ticketId}/relations`),
    enabled: !!ticketId && !!projectId,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { relatedTicketId: number; relationType: WorkItemRelationType }) =>
      apiClient.post<{ id: number }>(`/projects/${projectId}/tickets/${ticketId}/relations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
      });
    },
  });
}

export function useRemoveTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relatedId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/relations?relatedId=${relatedId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
      });
    },
  });
}

export function useAddAttachment(
  options?: Omit<UseMutationOptions<{ id: number }, Error, AddAttachmentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number }, Error, AddAttachmentInput>({
    mutationFn: ({ ticketId, projectId = 0, fileName, fileUrl, fileKey, fileSize, mimeType }) =>
      apiClient.post<{ id: number }>(`/projects/${projectId}/tickets/${ticketId}/attachments`, {
        fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}
