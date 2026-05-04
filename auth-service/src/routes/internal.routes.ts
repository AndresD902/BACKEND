import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { internalController } from '../controllers/internal.controller';
import { notifyEmployeeChangeSchema } from '../schemas/auth.schema';

const internalRouter = Router();

internalRouter.post(
  '/notify-employee-change',
  validateRequest(notifyEmployeeChangeSchema),
  internalController.notifyEmployeeChange,
);

export default internalRouter;
