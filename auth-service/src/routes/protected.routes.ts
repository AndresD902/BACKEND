import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Router, Response } from 'express';
import { authorize } from '../middlewares/authorize.middleware';
import { RoleName } from '../entities/role.entity';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { changePasswordSchema } from '../schemas/auth.schema';
import { userController } from '../controllers/user.controller';
import { authController } from '../controllers/auth.controller';

const protectedRouter = Router();

protectedRouter.get(
    '/me',
    authenticate,
    (req: AuthenticatedRequest, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Authenticated user data retrieved successfully',
            data: req.user!,
        });
    },
)

protectedRouter.get(
    '/admin-only',
    authenticate,
    authorize(RoleName.ADMIN),
    (req: AuthenticatedRequest, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Welcome, admin user',
            data: req.user!,
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
            data: req.user!,
        });
    },
);

protectedRouter.get(
  '/profile',
  authenticate,
  userController.getProfile,
);

protectedRouter.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  userController.changePassword,
);

protectedRouter.get(
  '/preferences',
  authenticate,
  authController.getPreferences,
);

protectedRouter.patch(
  '/preferences',
  authenticate,
  authController.updatePreferences,
);

export default protectedRouter;
