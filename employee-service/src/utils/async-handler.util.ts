import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps async route handlers so unhandled rejections reach the error-handler middleware.
// The wrapper MUST be async (returns Promise<void>) so that `await handler(req, res, next)`
// in tests waits for the full execution before asserting on res.status / res.json.
export const asyncHandler = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
