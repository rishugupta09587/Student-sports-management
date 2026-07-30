import { z } from 'zod';
import { BLOOD_GROUPS, GENDERS } from '@/types/student';

export const studentFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  usn: z
    .string()
    .trim()
    .length(10, 'USN must be exactly 10 characters')
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  dob: z.string().optional().or(z.literal('')),
  gender: z.union([z.enum(GENDERS), z.literal('')]).optional(),
  semester: z.string().max(20).optional().or(z.literal('')),
  branch: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').max(150).optional().or(z.literal('')),
  motherName: z.string().max(120).optional().or(z.literal('')),
  fatherName: z.string().max(120).optional().or(z.literal('')),
  sport: z.string().max(100).optional().or(z.literal('')),
  bloodGroup: z.union([z.enum(BLOOD_GROUPS), z.literal('')]).optional(),
});

export type StudentFormSchema = z.infer<typeof studentFormSchema>;
