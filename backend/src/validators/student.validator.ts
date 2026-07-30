import { z } from 'zod';
import { BLOOD_GROUPS, GENDERS } from '../models/Student.model';

const emptyToUndefined = (val: unknown) => (val === '' || val === null ? undefined : val);

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  usn: z
    .string()
    .trim()
    .length(10, 'USN must be exactly 10 characters')
    .transform((v) => v.toUpperCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  dob: z.preprocess(emptyToUndefined, z.string().optional()),
  gender: z.preprocess(emptyToUndefined, z.enum(GENDERS).optional()),
  semester: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  branch: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  email: z.preprocess(emptyToUndefined, z.string().email('Invalid email').max(150).optional()),
  motherName: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  fatherName: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  sport: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  bloodGroup: z.preprocess(emptyToUndefined, z.enum(BLOOD_GROUPS).optional()),
});

export const updateStudentSchema = createStudentSchema;

export const listStudentsQuerySchema = z.object({
  search: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  sport: z.string().trim().optional(),
  gender: z.enum(GENDERS).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  semester: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'usn', 'branch', 'sport', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
