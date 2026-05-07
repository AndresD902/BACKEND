import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

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
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token requerido' });
    return;
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
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

export const requireRol =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    if (!roles.includes(authReq.user.rol)) {
      res.status(403).json({ success: false, message: 'No tienes permisos para esta operación' });
      return;
    }
    next();
  };
