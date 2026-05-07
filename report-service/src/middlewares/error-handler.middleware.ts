import { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/app-error';

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

  process.stderr.write(`Unhandled error: ${err.stack ?? err.message}\n`);

  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: { code: 'INTERNAL_SERVER_ERROR', details: isDev ? err.message : null },
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
};
