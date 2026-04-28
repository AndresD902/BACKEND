import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { createUserSchema, loginSchema, refreshTokenSchema, logoutSchema } from '../schemas/auth.schema';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/register', validateRequest(createUserSchema), (req, res, next) =>
  authController.register(req, res, next),
);

authRoutes.post('/login', validateRequest(loginSchema), (req, res, next) =>
  authController.login(req, res, next),
);

authRoutes.post('/refresh', validateRequest(refreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next),
);

authRoutes.post('/logout', validateRequest(logoutSchema), (req, res, next) =>
  authController.logout(req, res, next),
);

authRoutes.post('/logout-all', authenticate, (req, res, next) =>
  authController.logoutAll(req as AuthenticatedRequest, res, next),
);

export default authRoutes;
