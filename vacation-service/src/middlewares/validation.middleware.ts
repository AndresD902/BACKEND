import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../shared/errors/bad-request.error';

/**
 * Returns an Express middleware that validates `req.body` against the
 * provided Zod schema.
 *
 * On success, `req.body` is replaced with the parsed (and coerced) value.
 * On failure, `next(BadRequestError)` is called with field-level details
 * so the client knows exactly which fields are invalid.
 */
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
