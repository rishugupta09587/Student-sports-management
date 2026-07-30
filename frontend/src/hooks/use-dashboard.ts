import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/api/dashboard.api';

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboardStats, refetchInterval: 60_000 });
}
