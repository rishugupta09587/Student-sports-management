import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as templatesApi from '@/api/templates.api';
import { ApiClientError } from '@/api/client';

export const templateKeys = { all: ['templates'] as const };

export function useTemplates() {
  return useQuery({ queryKey: templateKeys.all, queryFn: templatesApi.fetchTemplates });
}

export function useUploadTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, file }: { name: string; file: File }) => templatesApi.uploadTemplate(name, file),
    onSuccess: () => {
      toast.success('Template uploaded successfully');
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesApi.deleteTemplate(id),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useGenerateFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, studentId, fileName }: { templateId: string; studentId: string; fileName: string }) =>
      templatesApi.generateFromTemplate(templateId, studentId, fileName),
    onSuccess: () => toast.success('Document generated and downloaded'),
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}
