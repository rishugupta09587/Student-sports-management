import type { Student } from './student';
import type { Report } from './report';

export interface DashboardStats {
  totals: { students: number; reports: number; templates: number };
  byBranch: { label: string; count: number }[];
  bySport: { label: string; count: number }[];
  byGender: { label: string; count: number }[];
  byBloodGroup: { label: string; count: number }[];
  recentStudents: Student[];
  recentReports: Report[];
}
