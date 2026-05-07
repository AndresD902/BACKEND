import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { internalController } from '../controllers/internal.controller';
import { notifyEmployeeChangeSchema, notifyCorrectionRequestSchema } from '../schemas/auth.schema';

const internalRouter = Router();

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
