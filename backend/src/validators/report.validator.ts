import { z } from 'zod';
import { REPORT_FORMATS } from '../models/Report.model';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const generateReportSchema = z.object({
  studentIds: z.array(objectId).min(1, 'Select at least one student'),
  format: z.enum(REPORT_FORMATS).default('vtu_eligibility'),
});

export const generateAllReportSchema = z.object({
  format: z.enum(REPORT_FORMATS).default('vtu_eligibility'),
});

export const generateCustomReportSchema = z.object({
  studentIds: z.array(objectId).min(1, 'Select at least one student'),
  title: z.string().trim().max(200).default('Custom Report'),
  content: z.string().min(1, 'Report content is required'),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type GenerateAllReportInput = z.infer<typeof generateAllReportSchema>;
export type GenerateCustomReportInput = z.infer<typeof generateCustomReportSchema>;
