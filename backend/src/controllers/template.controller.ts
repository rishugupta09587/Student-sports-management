import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { renderTemplateSchema, uploadTemplateSchema } from '../validators/template.validator';
import * as templateService from '../services/template.service';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const getTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await templateService.listTemplates();
  sendSuccess(res, templates);
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.getTemplateById(req.params.id);
  sendSuccess(res, template);
});

export const uploadTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Template .docx file is required');
  const { name } = uploadTemplateSchema.parse(req.body);
  const template = await templateService.uploadTemplate(name, req.file);
  sendSuccess(res, template, 201);
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  await templateService.deleteTemplate(req.params.id);
  sendSuccess(res, { id: req.params.id });
});

export const renderTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = renderTemplateSchema.parse(req.body);
  const { buffer, fileName } = await templateService.renderTemplateForStudent(req.params.id, studentId);
  res.setHeader('Content-Type', DOCX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});
