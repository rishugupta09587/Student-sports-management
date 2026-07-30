import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Meta): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(res: Response, statusCode: number, message: string, details?: unknown): Response {
  return res.status(statusCode).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
}
