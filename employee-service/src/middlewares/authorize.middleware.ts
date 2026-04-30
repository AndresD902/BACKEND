import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const requireRol =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!roles.includes(authReq.user.rol)) {
      res.status(403).json({ error: 'No tienes permisos para esta operación' });
      return;
    }
    next();
  };
