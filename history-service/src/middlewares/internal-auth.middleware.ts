import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { verifyToken, AuthenticatedRequest } from './auth.middleware';
import { requireRol } from './authorize.middleware';

function hasValidInternalApiKey(req: Request): boolean {
  const headerKey = req.headers['x-internal-key'];
  return typeof headerKey === 'string' && headerKey === env.internalApiKey;
}

export const verifyInternalApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!hasValidInternalApiKey(req)) {
    next(new UnauthorizedError('Invalid internal API key'));
    return;
  }

  next();
};

export const allowInternalApiKeyOrJwtRoles =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (hasValidInternalApiKey(req)) {
      next();
      return;
    }

    verifyToken(req as AuthenticatedRequest, res, (authError?: unknown) => {
      if (authError) {
        next(authError);
        return;
      }

      requireRol(...roles)(req as AuthenticatedRequest, res, next);
    });
  };
