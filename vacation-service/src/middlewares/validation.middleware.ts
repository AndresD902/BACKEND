import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../shared/errors/bad-request.error';

export const validateRequest =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new BadRequestError('Validation error', result.error.flatten().fieldErrors));
    }
    req.body = result.data;
    next();
  };
