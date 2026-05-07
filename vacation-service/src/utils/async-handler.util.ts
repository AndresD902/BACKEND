import { NextFunction, Request, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so that any rejected promise is forwarded
 * to Express's error-handling middleware via `next(err)`.
 *
 * Without this wrapper, unhandled async rejections are silently swallowed
 * in Express 4 (Express 5 handles them natively, but the wrapper keeps
 * the code portable).
 */
export const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
