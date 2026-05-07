import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app-error';

export const requireQueryParams =
  (...params: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const missing = params.filter(p => !req.query[p]);
    if (missing.length > 0) {
      next(new AppError(
        `Parámetros requeridos faltantes: ${missing.join(', ')}`,
        400,
        'MISSING_QUERY_PARAMS',
      ));
      return;
    }
    next();
  };
