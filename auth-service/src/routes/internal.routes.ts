import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { notifyEmployeeChangeSchema } from '../schemas/auth.schema';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { env } from '../config/env';

const internalRouter = Router();

function verifyInternalKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'];
  if (key !== env.internalApiKey) {
    return next(new UnauthorizedError('Invalid internal API key'));
  }
  next();
}

internalRouter.post(
  '/notify-employee-change',
  verifyInternalKey,
  validateRequest(notifyEmployeeChangeSchema),
  authController.notifyEmployeeChange,
);

export default internalRouter;
