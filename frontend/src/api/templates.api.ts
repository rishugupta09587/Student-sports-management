import { apiClient } from './client';
import type { ApiSuccess } from '@/types/api';
import type { Template } from '@/types/template';
import { downloadBlob } from './reports.api';

export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await apiClient.get<ApiSuccess<Template[]>>('/templates');
  return data.data;
}

export async function uploadTemplate(name: string, file: File): Promise<Template> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('template', file);
  const { data } = await apiClient.post<ApiSuccess<Template>>('/templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/templates/${id}`);
}

export async function generateFromTemplate(templateId: string, studentId: string, fileName: string): Promise<void> {
  const response = await apiClient.post(`/templates/${templateId}/generate`, { studentId }, { responseType: 'blob' });
  downloadBlob(response.data, fileName);
}
