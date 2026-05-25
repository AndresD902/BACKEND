import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AuthenticatedUser } from '../types/authenticated-user.type';

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
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret) as Record<string, unknown>;
    req.user = {
      id:    String(payload.id ?? payload.sub),
      email: String(payload.email),
      rol:   String(payload.rol ?? payload.role),
      companyId: payload.companyId === undefined ? undefined : Number(payload.companyId),
      employeeId: payload.employeeId === undefined ? undefined : Number(payload.employeeId),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
