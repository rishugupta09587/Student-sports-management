import { apiClient } from './client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { Report, ReportFormat } from '@/types/report';

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match?.[1] ?? fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function generateReport(studentIds: string[], format: ReportFormat): Promise<void> {
  const response = await apiClient.post('/reports/generate', { studentIds, format }, { responseType: 'blob' });
  downloadBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], `${format}_report.docx`));
}

export async function generateAllReport(format: ReportFormat): Promise<void> {
  const response = await apiClient.post('/reports/generate-all', { format }, { responseType: 'blob' });
  downloadBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], `all_${format}_report.docx`));
}

export async function generateCustomReport(studentIds: string[], title: string, content: string): Promise<void> {
  const response = await apiClient.post(
    '/reports/generate-custom',
    { studentIds, title, content },
    { responseType: 'blob' }
  );
  downloadBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], 'custom_report.docx'));
}

export async function fetchReportHistory(page: number, limit: number): Promise<{ reports: Report[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiSuccess<Report[]>>('/reports/history', { params: { page, limit } });
  return { reports: data.data, meta: data.meta! };
}
