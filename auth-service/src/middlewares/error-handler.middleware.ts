import { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/app-error';
import { success } from 'zod';



export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details ?? null,
      }
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: null,
    },
  });
};
