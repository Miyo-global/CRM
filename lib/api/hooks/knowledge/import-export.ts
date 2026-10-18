"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import {
  kbCollection,
  kbExportJobSchema,
  kbImportJobSchema,
  kbImportPlanSchema,
  kbImportResultSchema,
} from "./schemas";

export interface KbImportItem {
  title: string;
  contentText: string;
  parentPageId?: number;
  /** Both or neither: the pair is what identifies a re-import. */
  externalId?: string;
  externalSource?: string;
}

export interface KbImportInput {
  sourceType: "markdown" | "html" | "zip";
  items: KbImportItem[];
  spaceId?: number;
  visibility?: "private" | "org" | "public";
  duplicatePolicy?: "skip" | "update";
}

/** KB-0066: what an import would do, before it does it. */
export function useKbImportDryRun() {
  return useMutation({
    mutationFn: async (input: KbImportInput) =>
      kbImportPlanSchema.parse(await apiClient.post("/knowledge/pages/import/dry-run", input)),
  });
}

export function useKbImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: KbImportInput) =>
      kbImportResultSchema.parse(await apiClient.post("/knowledge/pages/import", input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useKbImportJobs() {
  return useQuery({
    queryKey: queryKeys.knowledge.importJobs(),
    queryFn: async () =>
      kbCollection(kbImportJobSchema).parse(await apiClient.get("/knowledge/import-jobs")),
  });
}

/**
 * A running job is polled; a finished one is not. Polling forever would keep a
 * tab waking up for a job that will never change again.
 */
export function useKbImportJob(importJobId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.importJob(importJobId ?? 0),
    queryFn: async () =>
      kbImportJobSchema.parse(await apiClient.get(`/knowledge/import-jobs/${importJobId}`)),
    enabled: !!importJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });
}

export function useRetryKbImportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (importJobId: number) =>
      apiClient.post(`/knowledge/import-jobs/${importJobId}/retry`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.importJobs() });
    },
  });
}

export function useCancelKbImportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (importJobId: number) =>
      apiClient.post(`/knowledge/import-jobs/${importJobId}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.importJobs() });
    },
  });
}

export function useKbExportJobs() {
  return useQuery({
    queryKey: queryKeys.knowledge.exportJobs(),
    queryFn: async () =>
      kbCollection(kbExportJobSchema).parse(await apiClient.get("/knowledge/export-jobs")),
  });
}

export function useStartKbExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { format: "markdown" | "html" }) =>
      apiClient.post("/knowledge/export-jobs", { scope: "all", ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.exportJobs() });
    },
  });
}

export function useKbExportDownloadUrl() {
  return useMutation({
    mutationFn: (exportJobId: number) =>
      apiClient.get<{ url: string; expiresAt: string | null; format: string }>(
        `/knowledge/export-jobs/${exportJobId}/download`,
      ),
  });
}

/**
 * One page comes back as the file itself, not a job, so it works with no
 * storage configured. The caller is handed a blob to save.
 */
export function useExportKbPage(pageId: number) {
  return useMutation({
    mutationFn: (input: { format: "markdown" | "html" }) =>
      apiClient.post<Blob>(`/knowledge/pages/${pageId}/export`, input, {
        responseType: "blob",
      }),
  });
}
