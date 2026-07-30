import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import {
  createStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
} from '../validators/student.validator';
import * as studentService from '../services/student.service';

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const query = listStudentsQuerySchema.parse(req.query);
  const { students, meta } = await studentService.listStudents(query);
  sendSuccess(res, students, 200, meta);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.getStudentById(req.params.id);
  sendSuccess(res, student);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const input = createStudentSchema.parse(req.body);
  const student = await studentService.createStudent(input, req.file);
  sendSuccess(res, student, 201);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const input = updateStudentSchema.parse(req.body);
  const student = await studentService.updateStudent(req.params.id, input, req.file);
  sendSuccess(res, student);
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  await studentService.deleteStudent(req.params.id);
  sendSuccess(res, { id: req.params.id });
});

export const exportStudents = asyncHandler(async (_req: Request, res: Response) => {
  const csv = await studentService.exportStudentsCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="students_export_${Date.now()}.csv"`);
  res.send(csv);
});

export const importStudents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('CSV file is required');
  const result = await studentService.importStudentsCsv(req.file.buffer);
  sendSuccess(res, result);
});
