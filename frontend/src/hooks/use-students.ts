import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as studentsApi from '@/api/students.api';
import { ApiClientError } from '@/api/client';
import type { StudentFormValues, StudentListParams } from '@/types/student';

export const studentKeys = {
  all: ['students'] as const,
  list: (params: StudentListParams) => [...studentKeys.all, 'list', params] as const,
  detail: (id: string) => [...studentKeys.all, 'detail', id] as const,
};

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentsApi.fetchStudents(params),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => studentsApi.fetchStudent(id!),
    enabled: Boolean(id),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: StudentFormValues) => studentsApi.createStudent(values),
    onSuccess: () => {
      toast.success('Student added successfully');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: StudentFormValues) => studentsApi.updateStudent(id, values),
    onSuccess: () => {
      toast.success('Student updated successfully');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.deleteStudent(id),
    onSuccess: () => {
      toast.success('Student deleted');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useImportStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => studentsApi.importStudentsCsv(file),
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} students${result.skipped.length ? `, skipped ${result.skipped.length}` : ''}`);
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}

export function useExportStudents() {
  return useMutation({
    mutationFn: async () => {
      const blob = await studentsApi.exportStudentsCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students_export_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: ApiClientError) => toast.error(error.message),
  });
}
