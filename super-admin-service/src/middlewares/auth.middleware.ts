import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../utils/jwt.util';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { AppError } from '../shared/errors/app-error';

export interface AuthenticatedRequest extends Request {
  superAdmin?: JwtPayload;
}

export const verifySuperAdminToken = (
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
    const payload = verifyJwt(token);
    if (payload.rol !== 'super_admin') {
      return next(new AppError('Acceso exclusivo para Super Administradores', 403, 'FORBIDDEN'));
    }
    req.superAdmin = payload;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
};

/** Protects the bootstrap register endpoint via a shared secret header. */
export const verifyRegisterSecret = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const { env } = require('../config/env') as { env: { registerSecret: string } };
  const provided = req.headers['x-register-secret'];
  if (provided !== env.registerSecret) {
    return next(new AppError('Acceso no autorizado al registro de Super Admin', 403, 'FORBIDDEN'));
  }
  next();
};
