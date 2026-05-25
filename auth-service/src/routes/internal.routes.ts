import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { internalController } from '../controllers/internal.controller';
import { internalCreateUserSchema, notifyEmployeeChangeSchema, notifyCorrectionRequestSchema } from '../schemas/auth.schema';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

const internalRouter = Router();

// Protege TODAS las rutas de este router — si el header no coincide, corta aquí
internalRouter.use((_req: Request, _res: Response, next: NextFunction) => {
  const key = _req.headers['x-internal-key'];
  if (typeof key !== 'string' || key !== env.internalApiKey) {
    return next(new UnauthorizedError('Invalid internal API key'));
  }
  next();
});

internalRouter.post(
  '/users',
  validateRequest(internalCreateUserSchema),
  internalController.createUser,
);

internalRouter.post(
  '/notify-employee-change',
  validateRequest(notifyEmployeeChangeSchema),
  internalController.notifyEmployeeChange,
);

internalRouter.post(
  '/notify-correction-request',
  validateRequest(notifyCorrectionRequestSchema),
  internalController.notifyCorrectionRequest,
);

export default internalRouter;
