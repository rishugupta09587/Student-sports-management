import { apiClient } from './client';
import type { ApiSuccess } from '@/types/api';
import type { DashboardStats } from '@/types/dashboard';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<ApiSuccess<DashboardStats>>('/dashboard');
  return data.data;
}
