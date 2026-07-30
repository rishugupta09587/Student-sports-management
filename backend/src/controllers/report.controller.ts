import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { generateAllReportSchema, generateCustomReportSchema, generateReportSchema } from '../validators/report.validator';
import * as reportService from '../services/report.service';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function sendDocx(res: Response, buffer: Buffer, fileName: string): void {
  res.setHeader('Content-Type', DOCX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
}

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  const { studentIds, format } = generateReportSchema.parse(req.body);
  const { buffer, fileName } = await reportService.generateReport(studentIds, format);
  sendDocx(res, buffer, fileName);
});

export const generateAllReport = asyncHandler(async (req: Request, res: Response) => {
  const { format } = generateAllReportSchema.parse(req.body);
  const { buffer, fileName } = await reportService.generateAllStudentsReport(format);
  sendDocx(res, buffer, fileName);
});

export const generateCustomReport = asyncHandler(async (req: Request, res: Response) => {
  const { studentIds, title, content } = generateCustomReportSchema.parse(req.body);
  const { buffer, fileName } = await reportService.generateCustomReport(studentIds, title, content);
  sendDocx(res, buffer, fileName);
});

export const getReportHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const { reports, meta } = await reportService.listReportHistory(page, limit);
  sendSuccess(res, reports, 200, meta);
});
