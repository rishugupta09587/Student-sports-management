import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import { sendError } from '../utils/ApiResponse';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'Validation failed', err.flatten());
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    sendError(res, 400, 'Validation failed', err.errors);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    sendError(res, 400, `Invalid ${err.path}: ${err.value}`);
    return;
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    sendError(res, 409, `${field} already exists`, err.keyValue);
    return;
  }

  if (err instanceof multer.MulterError) {
    sendError(res, 400, `Upload error: ${err.message}`);
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${message}`, { stack });
  sendError(res, 500, 'Internal server error');
}
