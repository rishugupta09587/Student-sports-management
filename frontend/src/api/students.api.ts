import { apiClient } from './client';
import type { ApiSuccess, PaginationMeta } from '@/types/api';
import type { ImportResult, Student, StudentFormValues, StudentListParams } from '@/types/student';

function toFormData(values: StudentFormValues): FormData {
  const formData = new FormData();
  formData.append('name', values.name);
  formData.append('usn', values.usn);
  formData.append('phone', values.phone);
  if (values.dob) formData.append('dob', values.dob);
  if (values.gender) formData.append('gender', values.gender);
  if (values.semester) formData.append('semester', values.semester);
  if (values.branch) formData.append('branch', values.branch);
  if (values.email) formData.append('email', values.email);
  if (values.motherName) formData.append('motherName', values.motherName);
  if (values.fatherName) formData.append('fatherName', values.fatherName);
  if (values.sport) formData.append('sport', values.sport);
  if (values.bloodGroup) formData.append('bloodGroup', values.bloodGroup);
  if (values.photo) formData.append('photo', values.photo);
  return formData;
}

export async function fetchStudents(params: StudentListParams): Promise<{ students: Student[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiSuccess<Student[]>>('/students', { params });
  return { students: data.data, meta: data.meta! };
}

export async function fetchStudent(id: string): Promise<Student> {
  const { data } = await apiClient.get<ApiSuccess<Student>>(`/students/${id}`);
  return data.data;
}

export async function createStudent(values: StudentFormValues): Promise<Student> {
  const { data } = await apiClient.post<ApiSuccess<Student>>('/students', toFormData(values), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function updateStudent(id: string, values: StudentFormValues): Promise<Student> {
  const { data } = await apiClient.put<ApiSuccess<Student>>(`/students/${id}`, toFormData(values), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteStudent(id: string): Promise<void> {
  await apiClient.delete(`/students/${id}`);
}

export async function exportStudentsCsv(): Promise<Blob> {
  const { data } = await apiClient.get('/students/export', { responseType: 'blob' });
  return data;
}

export async function importStudentsCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiSuccess<ImportResult>>('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
