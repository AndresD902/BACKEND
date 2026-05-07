import { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/app-error';

/**
 * Centralized Express error-handling middleware.
 *
 * - Known `AppError` subclasses are serialised with their HTTP status code.
 * - Unexpected errors produce a generic 500 response so internal details
 *   are never leaked to the client.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code, details: err.details ?? null },
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: { code: 'INTERNAL_SERVER_ERROR', details: null },
  });
};
