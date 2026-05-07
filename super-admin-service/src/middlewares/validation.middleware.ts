import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../shared/errors/app-error';

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('Datos de entrada inválidos', 400, 'VALIDATION_ERROR', details));
    }
    req.body = result.data;
    next();
  };
