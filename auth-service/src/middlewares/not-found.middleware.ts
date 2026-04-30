import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../shared/errors/not-found.error';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
