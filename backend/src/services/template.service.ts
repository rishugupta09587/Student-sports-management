import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { ITemplate, Template } from '../models/Template.model';
import { IStudent, Student } from '../models/Student.model';
import { ApiError } from '../utils/ApiError';
import { deleteAsset, uploadBuffer } from './cloudinaryUpload.service';

function extractPlaceholders(buffer: Buffer): string[] {
  let doc: Docxtemplater;
  try {
    const zip = new PizZip(buffer);
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  } catch {
    throw ApiError.badRequest('Invalid or corrupted .docx template');
  }

  const fullText = doc.getFullText();
  const matches = fullText.match(/\{[^{}]+\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1).trim()))).filter(Boolean);
}

export async function uploadTemplate(name: string, file: Express.Multer.File): Promise<ITemplate> {
  const placeholders = extractPlaceholders(file.buffer);
  const uploaded = await uploadBuffer(file.buffer, 'templates', 'raw');

  return Template.create({
    name,
    originalFilename: file.originalname,
    fileUrl: uploaded.url,
    filePublicId: uploaded.publicId,
    placeholders,
    sizeBytes: file.size,
  });
}

export async function listTemplates(): Promise<ITemplate[]> {
  return Template.find().sort({ createdAt: -1 });
}

export async function getTemplateById(id: string): Promise<ITemplate> {
  const template = await Template.findById(id);
  if (!template) throw ApiError.notFound('Template not found');
  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const template = await Template.findById(id);
  if (!template) throw ApiError.notFound('Template not found');
  if (template.filePublicId) {
    await deleteAsset(template.filePublicId, 'raw').catch(() => undefined);
  }
  await template.deleteOne();
}

function buildPlaceholderData(student: IStudent): Record<string, string> {
  return {
    NAME: student.name ?? '',
    USN: student.usn ?? '',
    BRANCH: student.branch ?? '',
    SEMESTER: student.semester ?? '',
    PHONE: student.phone ?? '',
    EMAIL: student.email ?? '',
    SPORT: student.sport ?? '',
    DOB: student.dob ?? '',
    GENDER: student.gender ?? '',
    MOTHER_NAME: student.motherName ?? '',
    FATHER_NAME: student.fatherName ?? '',
    BLOOD_GROUP: student.bloodGroup ?? '',
  };
}

export async function renderTemplateForStudent(templateId: string, studentId: string): Promise<{ buffer: Buffer; fileName: string }> {
  const template = await getTemplateById(templateId);
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const response = await fetch(template.fileUrl);
  if (!response.ok) throw ApiError.internal('Failed to fetch template file');
  const templateBuffer = Buffer.from(await response.arrayBuffer());

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(buildPlaceholderData(student));

  const buffer = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
  const fileName = `${template.name.replace(/\s+/g, '_')}_${student.usn}.docx`;
  return { buffer, fileName };
}
