export const REPORT_FORMATS = ['vtu_eligibility', 'hod_bonafide', 'tournament_bonafide', 'custom'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface Report {
  _id: string;
  format: ReportFormat;
  scope: 'single' | 'multiple' | 'all';
  studentIds: string[];
  studentCount: number;
  fileUrl?: string;
  fileName: string;
  generatedContent?: string;
  createdAt: string;
}

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  vtu_eligibility: 'VTU Eligibility Proforma',
  hod_bonafide: 'HOD Bonafide Certificate',
  tournament_bonafide: 'Tournament Bonafide Certificate',
  custom: 'Custom Report',
};
