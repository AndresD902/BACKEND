import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { AppError } from '../shared/errors/app-error';

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map((e: ZodIssue) => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('Datos de entrada inválidos', 400, 'VALIDATION_ERROR', details));
    }
    req.body = result.data;
    next();
  };
