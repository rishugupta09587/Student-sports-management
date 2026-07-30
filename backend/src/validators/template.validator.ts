import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const uploadTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(150),
});

export const renderTemplateSchema = z.object({
  studentId: objectId,
});
