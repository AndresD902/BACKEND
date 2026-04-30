import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export interface AuthenticatedUser {
  id: string;
  email: string;
  rol: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token requerido'));
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret) as Record<string, unknown>;
    req.user = {
      id:    String(payload.id ?? payload.sub),
      email: String(payload.email),
      rol:   String(payload.rol ?? payload.role),
    };
    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
};
