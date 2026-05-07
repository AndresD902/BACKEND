import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';

export type RoleName = 'ADMIN' | 'HR' | 'CONSULTATION';

export interface AuthenticatedUser {
  sub:   string;
  email: string;
  role:  RoleName;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface JwtPayload {
  sub:   string;
  email: string;
  role:  RoleName;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * decoded user payload to `req.user`.  Calls `next(UnauthorizedError)`
 * if the header is missing, malformed, or the token is invalid/expired.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return next(new UnauthorizedError('Authorization header is required'));

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new UnauthorizedError('Invalid authorization format'));

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = { sub: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Role-based access control middleware factory.
 * Must be used **after** `authenticate`.
 *
 * @param allowedRoles - One or more roles that may access the route.
 * @returns Express middleware that calls `next(ForbiddenError)` when the
 *          authenticated user's role is not in the allowed list.
 */
export const authorize = (...allowedRoles: RoleName[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new ForbiddenError('User not authenticated'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('User does not have permission to access this resource'));
    }
    next();
  };
