import { Types } from 'mongoose';
import { IStudent, Student } from '../models/Student.model';
import { IReport, Report, ReportFormat } from '../models/Report.model';
import { ApiError } from '../utils/ApiError';
import { buildVtuEligibilityDocx } from './docx/vtuEligibility.docx';
import { buildHodBonafideDocx } from './docx/hodBonafide.docx';
import { buildTournamentBonafideDocx } from './docx/tournamentBonafide.docx';
import { buildCustomReportDocx } from './docx/customReport.docx';
import { isStorageConfigured, uploadBuffer } from './cloudinaryUpload.service';

async function buildDocxForFormat(format: ReportFormat, students: IStudent[], content?: string): Promise<Buffer> {
  switch (format) {
    case 'vtu_eligibility':
      return buildVtuEligibilityDocx(students);
    case 'hod_bonafide':
      return buildHodBonafideDocx(students);
    case 'tournament_bonafide':
      return buildTournamentBonafideDocx(students);
    case 'custom':
      if (!content) throw ApiError.badRequest('content is required for custom reports');
      return buildCustomReportDocx(students, content);
    default:
      throw ApiError.badRequest(`Unsupported report format: ${format as string}`);
  }
}

interface GeneratedReport {
  buffer: Buffer;
  fileName: string;
  report: IReport;
}

async function persistReport(
  format: ReportFormat,
  scope: 'single' | 'multiple' | 'all',
  students: IStudent[],
  buffer: Buffer,
  fileName: string,
  generatedContent?: string
): Promise<IReport> {
  let fileUrl: string | undefined;
  let filePublicId: string | undefined;

  if (isStorageConfigured()) {
    const uploaded = await uploadBuffer(buffer, 'reports', 'raw').catch(() => null);
    if (uploaded) {
      fileUrl = uploaded.url;
      filePublicId = uploaded.publicId;
    }
  }

  return Report.create({
    format,
    scope,
    studentIds: students.map((s) => s._id),
    studentCount: students.length,
    fileUrl,
    filePublicId,
    fileName,
    generatedContent,
  });
}

export async function generateReport(studentIds: string[], format: ReportFormat): Promise<GeneratedReport> {
  const students = await Student.find({ _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) } });
  if (!students.length) throw ApiError.notFound('No matching students found');

  const buffer = await buildDocxForFormat(format, students);
  const fileName = `${format}_report_${Date.now()}.docx`;
  const scope = students.length === 1 ? 'single' : 'multiple';
  const report = await persistReport(format, scope, students, buffer, fileName);

  return { buffer, fileName, report };
}

export async function generateAllStudentsReport(format: ReportFormat): Promise<GeneratedReport> {
  const students = await Student.find().sort({ name: 1 });
  if (!students.length) throw ApiError.notFound('No students found to generate report');

  const buffer = await buildDocxForFormat(format, students);
  const fileName = `complete_${format}_report_${Date.now()}.docx`;
  const report = await persistReport(format, 'all', students, buffer, fileName);

  return { buffer, fileName, report };
}

export async function generateCustomReport(
  studentIds: string[],
  title: string,
  content: string
): Promise<GeneratedReport> {
  const students = await Student.find({ _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) } });
  if (!students.length) throw ApiError.notFound('No matching students found');

  const buffer = await buildCustomReportDocx(students, content);
  const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.docx`;
  const scope = students.length === 1 ? 'single' : 'multiple';
  const report = await persistReport('custom', scope, students, buffer, fileName, content);

  return { buffer, fileName, report };
}

export async function listReportHistory(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(),
  ]);
  return { reports, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
