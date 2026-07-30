import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as reportsApi from '@/api/reports.api';
import { ApiClientError } from '@/api/client';
import type { ReportFormat } from '@/types/report';

export function useReportHistory(page: number, limit = 10) {
  return useQuery({
    queryKey: ['reports', 'history', page, limit],
    queryFn: () => reportsApi.fetchReportHistory(page, limit),
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: ({ studentIds, format }: { studentIds: string[]; format: ReportFormat }) =>
      reportsApi.generateReport(studentIds, format),
    onSuccess: () => toast.success('Report generated and downloaded'),
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useGenerateAllReport() {
  return useMutation({
    mutationFn: (format: ReportFormat) => reportsApi.generateAllReport(format),
    onSuccess: () => toast.success('Report generated for all students'),
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useGenerateCustomReport() {
  return useMutation({
    mutationFn: ({ studentIds, title, content }: { studentIds: string[]; title: string; content: string }) =>
      reportsApi.generateCustomReport(studentIds, title, content),
    onSuccess: () => toast.success('Custom report generated and downloaded'),
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}
