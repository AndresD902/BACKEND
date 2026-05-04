import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Router, Response, NextFunction } from 'express';
import { authorize } from '../middlewares/authorize.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { RoleName } from '../entities/role.entity';
import { userService } from '../services/user.service';
import { authController } from '../controllers/auth.controller';
import { changePasswordSchema, updatePreferencesSchema } from '../schemas/auth.schema';

const protectedRouter = Router();

protectedRouter.get(
  '/me',
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Authenticated user data retrieved successfully',
      data: req.user,
    });
  },
);

protectedRouter.get(
  '/profile',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await userService.findById(req.user!.sub);
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    });
  },
);

protectedRouter.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authController.changePassword(req, res, next),
);

protectedRouter.get(
  '/preferences',
  authenticate,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authController.getPreferences(req, res, next),
);

protectedRouter.patch(
  '/preferences',
  authenticate,
  validateRequest(updatePreferencesSchema),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authController.updatePreferences(req, res, next),
);

protectedRouter.get(
  '/admin-only',
  authenticate,
  authorize(RoleName.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome, admin user',
      data: req.user,
    });
  },
);

protectedRouter.get(
  '/hr-or-admin',
  authenticate,
  authorize(RoleName.HR, RoleName.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome, HR or admin user',
      data: req.user,
    });
  },
);

export default protectedRouter;
