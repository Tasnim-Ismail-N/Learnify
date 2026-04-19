import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode ?? 500;

  // Always log the full error server-side
  logger.error('❌ Error on', req.method, req.path, '|', err.message, '\n', err.stack);

  // In development, expose the real message to the client
  const message = env.NODE_ENV === 'development'
    ? err.message
    : (err.isOperational ? err.message : 'Internal server error');

  res.status(statusCode).json({ error: message });
}

export function createError(message: string, statusCode = 500): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
