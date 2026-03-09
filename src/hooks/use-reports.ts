"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  deleteReport,
  getReport,
  getReportDataset,
  listReports,
  updateReport,
} from "@/services/reports.service";
import { CreateReportPayload, UpdateReportPayload } from "@/types/report";

export const reportsKeys = {
  all: ["reports"] as const,
  list: (quizId: number) => [...reportsKeys.all, "list", quizId] as const,
  detail: (quizId: number, reportId: number) => 
    [...reportsKeys.all, "detail", quizId, reportId] as const,
  dataset: (quizId: number, reportId: number) =>
    [...reportsKeys.all, "dataset", quizId, reportId] as const,
};

export function useReportsList(quizId?: number | null) {
  return useQuery({
    queryKey: quizId ? reportsKeys.list(quizId) : [...reportsKeys.all, "list", "disabled"],
    queryFn: () => listReports(quizId as number),
    enabled: !!quizId,
    staleTime: 0, // Sempre considera os dados como "stale" (vai refetch ao focar na aba)
    gcTime: 5 * 60 * 1000, // Mantém cache por 5 minutos
  });
}

export function useReport(quizId?: number | null, reportId?: number | null) {
  return useQuery({
    queryKey: 
      quizId && reportId 
        ? reportsKeys.detail(quizId, reportId) 
        : [...reportsKeys.all, "detail", "disabled"],
    queryFn: () => getReport(quizId as number, reportId as number),
    enabled: !!quizId && !!reportId,
  });
}

export function useCreateReport(quizId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReportPayload) => createReport(quizId as number, payload),
    onSuccess: async () => {
      if (!quizId) return;
      await queryClient.invalidateQueries({ queryKey: reportsKeys.list(quizId) });
      // Força refetch para garantir que os dados estão atualizados
      await queryClient.refetchQueries({ queryKey: reportsKeys.list(quizId) });
    },
  });
}

export function useReportDataset(quizId?: number | null, reportId?: number | null) {
  return useQuery({
    queryKey:
      quizId && reportId
        ? reportsKeys.dataset(quizId, reportId)
        : [...reportsKeys.all, "dataset", "disabled"],
    queryFn: () => getReportDataset(quizId as number, reportId as number),
    enabled: !!quizId && !!reportId,
  });
}

export function useUpdateReport(quizId?: number | null, reportId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateReportPayload) =>
      updateReport(quizId as number, reportId as number, payload),
    onSuccess: () => {
      if (!quizId || !reportId) return;
      queryClient.invalidateQueries({ queryKey: reportsKeys.list(quizId) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.detail(quizId, reportId) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.dataset(quizId, reportId) });
    },
  });
}

export function useDeleteReport(quizId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: number) => deleteReport(quizId as number, reportId),
    onSuccess: (_, reportId) => {
      if (!quizId) return;
      queryClient.invalidateQueries({ queryKey: reportsKeys.list(quizId) });
      queryClient.removeQueries({ queryKey: reportsKeys.detail(quizId, reportId) });
      queryClient.removeQueries({ queryKey: reportsKeys.dataset(quizId, reportId) });
    },
  });
}
